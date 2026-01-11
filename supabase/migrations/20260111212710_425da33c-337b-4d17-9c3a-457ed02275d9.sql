-- ============================================
-- PART 1: Create entitlements table for course access tracking
-- ============================================

-- Create entitlement_type enum
CREATE TYPE public.entitlement_type AS ENUM ('trial', 'paid', 'org_seat', 'admin_granted');

-- Create entitlement_status enum
CREATE TYPE public.entitlement_status AS ENUM ('active', 'expired', 'suspended', 'revoked');

-- Create entitlements table
CREATE TABLE public.entitlements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    entitlement_type public.entitlement_type NOT NULL DEFAULT 'paid',
    status public.entitlement_status NOT NULL DEFAULT 'active',
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    seat_id UUID REFERENCES public.rvt_seats(id) ON DELETE SET NULL,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT entitlements_user_course_unique UNIQUE (user_id, course_id, entitlement_type)
);

-- Enable RLS
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- RLS policies for entitlements
CREATE POLICY "Users can view their own entitlements"
ON public.entitlements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all entitlements"
ON public.entitlements FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage entitlements"
ON public.entitlements FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX idx_entitlements_course_id ON public.entitlements(course_id);
CREATE INDEX idx_entitlements_status ON public.entitlements(status);

-- Trigger for updated_at
CREATE TRIGGER update_entitlements_updated_at
BEFORE UPDATE ON public.entitlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PART 2: Create deny_reason enum for access snapshot
-- ============================================

CREATE TYPE public.access_deny_reason AS ENUM (
    'none',
    'enrollment_required',
    'payment_required',
    'org_seat_required',
    'suspended',
    'expired'
);

-- ============================================
-- PART 3: Create get_access_snapshot RPC function
-- ============================================

CREATE OR REPLACE FUNCTION public.get_access_snapshot(p_course_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_roles TEXT[];
    v_profile RECORD;
    v_org RECORD;
    v_seat RECORD;
    v_entitlement RECORD;
    v_order RECORD;
    v_enrollment_count INTEGER;
    v_course_requires_payment BOOLEAN := TRUE;
    v_can_access BOOLEAN := FALSE;
    v_deny_reason public.access_deny_reason := 'none';
    v_deny_detail JSONB := '{}';
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'user_id', NULL,
            'authenticated', FALSE,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Get user roles
    SELECT COALESCE(array_agg(role::TEXT), ARRAY['student']::TEXT[])
    INTO v_roles
    FROM public.user_roles
    WHERE user_id = v_user_id;
    
    IF v_roles IS NULL OR array_length(v_roles, 1) IS NULL THEN
        v_roles := ARRAY['student']::TEXT[];
    END IF;
    
    -- Get profile
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE user_id = v_user_id;
    
    -- Get organization info if user has one
    IF v_profile.organization_id IS NOT NULL THEN
        SELECT * INTO v_org
        FROM public.organizations
        WHERE id = v_profile.organization_id;
        
        -- Check for seat
        SELECT * INTO v_seat
        FROM public.rvt_seats
        WHERE assigned_user_id = v_user_id
        AND organization_id = v_profile.organization_id
        AND status IN ('assigned', 'used')
        LIMIT 1;
    END IF;
    
    -- Check for direct entitlement
    SELECT * INTO v_entitlement
    FROM public.entitlements
    WHERE user_id = v_user_id
    AND (course_id = p_course_id OR course_id IS NULL)
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until > now())
    ORDER BY 
        CASE entitlement_type 
            WHEN 'paid' THEN 1 
            WHEN 'org_seat' THEN 2 
            WHEN 'admin_granted' THEN 3 
            WHEN 'trial' THEN 4 
        END
    LIMIT 1;
    
    -- Check for paid order (legacy support)
    IF v_entitlement IS NULL AND p_course_id IS NOT NULL THEN
        SELECT * INTO v_order
        FROM public.orders
        WHERE user_id = v_user_id
        AND course_id = p_course_id
        AND status = 'paid'
        LIMIT 1;
    END IF;
    
    -- Check enrollment (user_progress indicates enrollment)
    SELECT COUNT(*) INTO v_enrollment_count
    FROM public.user_progress
    WHERE user_id = v_user_id
    AND (course_id = p_course_id OR p_course_id IS NULL);
    
    -- Determine access and deny reason
    -- Priority: 1) check enrollment, 2) check payment/entitlement, 3) check org seat
    
    -- Admins always have access
    IF 'admin' = ANY(v_roles) THEN
        v_can_access := TRUE;
        v_deny_reason := 'none';
    -- Check if user has valid entitlement
    ELSIF v_entitlement IS NOT NULL THEN
        v_can_access := TRUE;
        v_deny_reason := 'none';
    -- Check if user has paid order (legacy)
    ELSIF v_order IS NOT NULL THEN
        v_can_access := TRUE;
        v_deny_reason := 'none';
    -- Check org seat access
    ELSIF v_seat IS NOT NULL AND v_org.admin_approved = TRUE 
          AND v_org.payment_status IN ('paid', 'approved', 'test') THEN
        v_can_access := TRUE;
        v_deny_reason := 'none';
    -- Determine deny reason
    ELSIF v_profile.organization_id IS NOT NULL THEN
        -- User is part of org but no valid seat/access
        IF v_seat IS NULL THEN
            v_deny_reason := 'org_seat_required';
            v_deny_detail := jsonb_build_object(
                'org_name', v_org.name,
                'reason', 'No seat assigned'
            );
        ELSIF v_org.admin_approved = FALSE OR v_org.admin_approved IS NULL THEN
            v_deny_reason := 'org_seat_required';
            v_deny_detail := jsonb_build_object(
                'org_name', v_org.name,
                'reason', 'Organization not approved'
            );
        ELSE
            v_deny_reason := 'org_seat_required';
            v_deny_detail := jsonb_build_object(
                'org_name', v_org.name,
                'reason', 'Organization payment pending'
            );
        END IF;
    ELSE
        -- Individual user needs payment
        v_deny_reason := 'payment_required';
        v_deny_detail := jsonb_build_object(
            'course_id', p_course_id,
            'reason', 'Course payment required'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'authenticated', TRUE,
        'roles', v_roles,
        'enrollment_status', CASE 
            WHEN v_enrollment_count > 0 THEN 'active'
            ELSE 'none'
        END,
        'course_requires_payment', v_course_requires_payment,
        'entitlement_access', CASE
            WHEN v_entitlement IS NOT NULL THEN v_entitlement.entitlement_type::TEXT
            WHEN v_order IS NOT NULL THEN 'paid'
            WHEN v_seat IS NOT NULL THEN 'org_seat'
            ELSE 'none'
        END,
        'entitlement_valid_now', (v_entitlement IS NOT NULL OR v_order IS NOT NULL OR 
            (v_seat IS NOT NULL AND v_org.admin_approved = TRUE AND v_org.payment_status IN ('paid', 'approved', 'test'))),
        'organization_id', v_profile.organization_id,
        'org_name', v_org.name,
        'org_has_seat', (v_seat IS NOT NULL),
        'org_payment_status', v_org.payment_status,
        'org_admin_approved', v_org.admin_approved,
        'can_access_course', v_can_access,
        'deny_reason', v_deny_reason::TEXT,
        'deny_detail', v_deny_detail
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_access_snapshot(UUID) TO authenticated;

-- ============================================
-- PART 4: Create get_course_state RPC for module lock reasons
-- ============================================

CREATE OR REPLACE FUNCTION public.get_course_state(p_course_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_access_snapshot JSONB;
    v_modules JSONB;
    v_completed_modules UUID[];
    v_total_modules INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;
    
    -- Get access snapshot first
    v_access_snapshot := public.get_access_snapshot(p_course_id);
    
    -- Get completed module IDs for this user
    SELECT COALESCE(array_agg(module_id), ARRAY[]::UUID[])
    INTO v_completed_modules
    FROM public.user_progress
    WHERE user_id = v_user_id
    AND course_id = p_course_id
    AND is_completed = TRUE;
    
    -- Build module state list
    SELECT jsonb_agg(
        jsonb_build_object(
            'module_id', m.id,
            'module_number', m.module_number,
            'title', m.title,
            'is_active', m.is_active,
            'is_manager_only', COALESCE(m.is_manager_only, FALSE),
            'status', CASE
                WHEN m.id = ANY(v_completed_modules) THEN 'completed'
                WHEN NOT COALESCE(m.is_active, TRUE) THEN 'locked'
                WHEN NOT (v_access_snapshot->>'can_access_course')::BOOLEAN THEN 'locked'
                WHEN m.module_number > 1 AND NOT (
                    SELECT EXISTS (
                        SELECT 1 FROM public.course_modules prev
                        JOIN public.user_progress up ON up.module_id = prev.id
                        WHERE prev.course_id = p_course_id
                        AND prev.module_number = m.module_number - 1
                        AND up.user_id = v_user_id
                        AND up.is_completed = TRUE
                    )
                ) THEN 'locked'
                ELSE 'available'
            END,
            'lock_reason', CASE
                WHEN NOT COALESCE(m.is_active, TRUE) THEN 'module_unpublished'
                WHEN NOT (v_access_snapshot->>'can_access_course')::BOOLEAN THEN 
                    v_access_snapshot->>'deny_reason'
                WHEN m.module_number > 1 AND NOT (
                    SELECT EXISTS (
                        SELECT 1 FROM public.course_modules prev
                        JOIN public.user_progress up ON up.module_id = prev.id
                        WHERE prev.course_id = p_course_id
                        AND prev.module_number = m.module_number - 1
                        AND up.user_id = v_user_id
                        AND up.is_completed = TRUE
                    )
                ) THEN 'prerequisite_modules_incomplete'
                ELSE NULL
            END,
            'lock_reason_detail', CASE
                WHEN NOT (v_access_snapshot->>'can_access_course')::BOOLEAN THEN 
                    v_access_snapshot->'deny_detail'
                WHEN m.module_number > 1 AND NOT (
                    SELECT EXISTS (
                        SELECT 1 FROM public.course_modules prev
                        JOIN public.user_progress up ON up.module_id = prev.id
                        WHERE prev.course_id = p_course_id
                        AND prev.module_number = m.module_number - 1
                        AND up.user_id = v_user_id
                        AND up.is_completed = TRUE
                    )
                ) THEN jsonb_build_object('required_module', m.module_number - 1)
                ELSE NULL
            END
        ) ORDER BY m.module_number
    )
    INTO v_modules
    FROM public.course_modules m
    WHERE m.course_id = p_course_id;
    
    -- Get total modules count
    SELECT COUNT(*) INTO v_total_modules
    FROM public.course_modules
    WHERE course_id = p_course_id AND is_active = TRUE;
    
    RETURN jsonb_build_object(
        'course_id', p_course_id,
        'access', v_access_snapshot,
        'modules', COALESCE(v_modules, '[]'::JSONB),
        'total_modules', v_total_modules,
        'completed_modules', array_length(v_completed_modules, 1),
        'completion_percentage', CASE 
            WHEN v_total_modules > 0 THEN 
                ROUND((COALESCE(array_length(v_completed_modules, 1), 0)::NUMERIC / v_total_modules) * 100, 1)
            ELSE 0
        END
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_course_state(UUID) TO authenticated;

-- ============================================
-- PART 5: Enable realtime for access-related tables
-- ============================================

-- Enable replica identity for realtime
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.entitlements REPLICA IDENTITY FULL;
ALTER TABLE public.rvt_seats REPLICA IDENTITY FULL;

-- Add tables to realtime publication (if not already)
DO $$
BEGIN
    -- Check if supabase_realtime publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add tables if not already in publication
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'user_roles'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'entitlements'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.entitlements;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'rvt_seats'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.rvt_seats;
        END IF;
    END IF;
END $$;