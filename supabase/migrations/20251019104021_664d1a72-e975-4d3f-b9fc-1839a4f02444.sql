-- Phase 1: Enhanced Role System with Granular Permissions

-- 1. Create permissions enum (granular actions)
CREATE TYPE admin_permission AS ENUM (
  'user_create',
  'user_edit',
  'user_delete',
  'user_view_all',
  'org_create',
  'org_edit',
  'org_delete',
  'org_view_all',
  'role_assign',
  'role_revoke',
  'certificate_issue',
  'certificate_revoke',
  'certificate_view_all',
  'payment_view',
  'payment_refund',
  'content_edit',
  'content_publish',
  'analytics_view',
  'security_audit',
  'system_settings'
);

-- 2. Create role_permissions table (maps roles to permissions)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission admin_permission NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view permissions
CREATE POLICY "Admins can view role permissions"
ON public.role_permissions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 3. Insert default permission mappings
INSERT INTO public.role_permissions (role, permission) VALUES
  -- Admin: Full access
  ('admin', 'user_create'),
  ('admin', 'user_edit'),
  ('admin', 'user_delete'),
  ('admin', 'user_view_all'),
  ('admin', 'org_create'),
  ('admin', 'org_edit'),
  ('admin', 'org_delete'),
  ('admin', 'org_view_all'),
  ('admin', 'role_assign'),
  ('admin', 'role_revoke'),
  ('admin', 'certificate_issue'),
  ('admin', 'certificate_revoke'),
  ('admin', 'certificate_view_all'),
  ('admin', 'payment_view'),
  ('admin', 'payment_refund'),
  ('admin', 'content_edit'),
  ('admin', 'content_publish'),
  ('admin', 'analytics_view'),
  ('admin', 'security_audit'),
  ('admin', 'system_settings'),
  
  -- Dispensary Manager: Org-scoped access
  ('dispensary_manager', 'user_view_all'),
  ('dispensary_manager', 'certificate_view_all'),
  ('dispensary_manager', 'analytics_view'),
  
  -- Training Coordinator: Employee management
  ('training_coordinator', 'user_view_all'),
  ('training_coordinator', 'certificate_view_all'),
  ('training_coordinator', 'analytics_view');

-- 4. Create user_metadata table for additional user info
CREATE TABLE public.user_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT,
  employee_id TEXT,
  hire_date DATE,
  manager_id UUID REFERENCES auth.users(id),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_metadata ENABLE ROW LEVEL SECURITY;

-- Users can view own metadata
CREATE POLICY "Users can view own metadata"
ON public.user_metadata FOR SELECT
USING (user_id = auth.uid());

-- Admins can view/edit all metadata
CREATE POLICY "Admins can manage all metadata"
ON public.user_metadata FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Managers can view org metadata
CREATE POLICY "Managers can view org metadata"
ON public.user_metadata FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN user_roles ur ON ur.user_id = auth.uid()
    JOIN profiles p2 ON p2.user_id = auth.uid()
    WHERE ur.role IN ('dispensary_manager', 'training_coordinator')
    AND p1.user_id = user_metadata.user_id
    AND p1.organization_id = p2.organization_id
  )
);

-- 5. Create helper function for permission checking
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _permission admin_permission
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
    AND rp.permission = _permission
  )
$$;

-- 6. Add audit logging trigger for role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO security_audit_log (
      user_id,
      table_name,
      action_type,
      new_values,
      created_at
    ) VALUES (
      auth.uid(),
      'user_roles',
      'ROLE_ASSIGNED',
      jsonb_build_object(
        'target_user', NEW.user_id,
        'role', NEW.role
      ),
      NOW()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO security_audit_log (
      user_id,
      table_name,
      action_type,
      old_values,
      created_at
    ) VALUES (
      auth.uid(),
      'user_roles',
      'ROLE_REVOKED',
      jsonb_build_object(
        'target_user', OLD.user_id,
        'role', OLD.role
      ),
      NOW()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_role_changes
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION log_role_change();