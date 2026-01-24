-- =====================================================
-- DEPROVISIONING & REPROVISIONING LIFECYCLE SYSTEM
-- =====================================================

-- 1) Add soft-delete columns to profiles if not exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deactivated_by UUID NULL;

-- 2) Add accepted_by_user_id to org_invites for tracking
ALTER TABLE public.org_invites 
ADD COLUMN IF NOT EXISTS accepted_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3) Create deprovision_user RPC (soft-delete, revoke access, NOT hard delete)
CREATE OR REPLACE FUNCTION public.deprovision_user(
  p_user_id UUID,
  p_deactivated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_memberships_revoked INT := 0;
  v_roles_revoked INT := 0;
  v_seats_released INT := 0;
BEGIN
  -- Soft-delete profile
  UPDATE public.profiles
  SET 
    deactivated_at = NOW(),
    deactivated_by = p_deactivated_by,
    updated_at = NOW()
  WHERE user_id = p_user_id
  AND deactivated_at IS NULL;

  -- Revoke all organization memberships (soft revoke, not delete)
  UPDATE public.organization_members
  SET 
    status = 'revoked',
    updated_at = NOW()
  WHERE user_id = p_user_id
  AND status = 'active';
  GET DIAGNOSTICS v_memberships_revoked = ROW_COUNT;

  -- Deactivate user roles (if you have is_active column, else just record)
  DELETE FROM public.user_roles
  WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_roles_revoked = ROW_COUNT;

  -- Release any assigned RVT seats
  UPDATE public.rvt_seats
  SET 
    status = 'available',
    assigned_user_id = NULL,
    assigned_at = NULL
  WHERE assigned_user_id = p_user_id
  AND status = 'assigned';
  GET DIAGNOSTICS v_seats_released = ROW_COUNT;

  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'memberships_revoked', v_memberships_revoked,
    'roles_revoked', v_roles_revoked,
    'seats_released', v_seats_released,
    'deactivated_at', NOW()
  );

  RETURN v_result;
END;
$$;

-- 4) Create reprovision_user RPC (reactivate a deprovisioned user)
CREATE OR REPLACE FUNCTION public.reprovision_user(
  p_user_id UUID,
  p_organization_id UUID,
  p_role TEXT DEFAULT 'employee'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_email TEXT;
  v_member_id UUID;
BEGIN
  -- Reactivate profile
  UPDATE public.profiles
  SET 
    deactivated_at = NULL,
    deactivated_by = NULL,
    active_organization_id = p_organization_id,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Get user email
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AUTH_USER_NOT_FOUND');
  END IF;

  -- Reactivate or create membership
  INSERT INTO public.organization_members (
    organization_id, user_id, email, role, status
  ) VALUES (
    p_organization_id, p_user_id, v_email, p_role, 'active'
  )
  ON CONFLICT (organization_id, email, role) 
  DO UPDATE SET 
    user_id = p_user_id,
    status = 'active',
    updated_at = NOW()
  RETURNING id INTO v_member_id;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, CASE 
    WHEN p_role = 'dispensary_admin' THEN 'dispensary_manager'
    WHEN p_role = 'training_coordinator' THEN 'training_coordinator'
    ELSE 'student'
  END)
  ON CONFLICT (user_id, role) DO NOTHING;

  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'organization_id', p_organization_id,
    'member_id', v_member_id,
    'role', p_role
  );

  RETURN v_result;
END;
$$;

-- 5) Create accept_invite_for_existing_user RPC
-- Called when a user already has an auth account and clicks an invite link
CREATE OR REPLACE FUNCTION public.accept_invite_for_existing_user(
  p_user_id UUID,
  p_invite_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
  v_result JSONB;
  v_member_id UUID;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  -- Find valid invite
  SELECT * INTO v_invite 
  FROM public.org_invites 
  WHERE token = p_invite_token
  AND accepted_at IS NULL
  AND expires_at > NOW();

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_INVITE');
  END IF;

  -- Verify email matches
  IF LOWER(v_invite.email) != LOWER(v_user_email) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'EMAIL_MISMATCH',
      'expected_email', v_invite.email
    );
  END IF;

  -- Upsert organization membership
  INSERT INTO public.organization_members (
    organization_id, user_id, email, role, status
  ) VALUES (
    v_invite.organization_id, p_user_id, v_user_email, v_invite.role, 'active'
  )
  ON CONFLICT (organization_id, email, role) 
  DO UPDATE SET 
    user_id = p_user_id,
    status = 'active',
    updated_at = NOW()
  RETURNING id INTO v_member_id;

  -- Mark invite as accepted
  UPDATE public.org_invites
  SET 
    accepted_at = NOW(),
    accepted_by_user_id = p_user_id
  WHERE id = v_invite.id;

  -- Assign appropriate role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, CASE 
    WHEN v_invite.role = 'dispensary_admin' THEN 'dispensary_manager'
    WHEN v_invite.role = 'training_coordinator' THEN 'training_coordinator'
    ELSE 'student'
  END)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update profile with organization
  UPDATE public.profiles
  SET 
    active_organization_id = v_invite.organization_id,
    deactivated_at = NULL, -- Reactivate if was deactivated
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Get org name for response
  SELECT name INTO v_result FROM public.organizations WHERE id = v_invite.organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'organization_name', v_result,
    'role', v_invite.role,
    'member_id', v_member_id
  );
END;
$$;

-- 6) Create invalidate_pending_invites function (for resend)
CREATE OR REPLACE FUNCTION public.invalidate_pending_invites(
  p_email TEXT,
  p_organization_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.org_invites
  SET expires_at = NOW() - INTERVAL '1 second'
  WHERE LOWER(email) = LOWER(p_email)
  AND accepted_at IS NULL
  AND expires_at > NOW()
  AND (p_organization_id IS NULL OR organization_id = p_organization_id);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 7) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.deprovision_user TO service_role;
GRANT EXECUTE ON FUNCTION public.reprovision_user TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_invite_for_existing_user TO service_role;
GRANT EXECUTE ON FUNCTION public.invalidate_pending_invites TO service_role;