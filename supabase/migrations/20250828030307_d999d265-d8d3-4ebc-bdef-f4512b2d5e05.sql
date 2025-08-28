-- CRITICAL SECURITY FIXES

-- 1. Fix Profile Data Exposure - Remove overly permissive service role policy
DROP POLICY IF EXISTS "Service role can manage all data" ON public.profiles;

-- Add proper RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles  
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Re-add service role policy with specific scope
CREATE POLICY "Service role can manage profiles for automation" ON public.profiles
FOR ALL USING (current_setting('role') = 'service_role');

-- 2. CRITICAL: Fix Role Privilege Escalation - Remove user self-assignment
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;

-- Only service role and admins can assign roles
CREATE POLICY "Only service role can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- 3. Secure Email Logs - Restrict access
CREATE POLICY "Admins can view email logs" ON public.email_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Users can view their own email logs" ON public.email_logs
FOR SELECT USING (auth.uid() = user_id);

-- 4. Secure Notification Rules - Admin only
DROP POLICY IF EXISTS "Service role can manage all notification data" ON public.notification_rules;

CREATE POLICY "Service role can manage notification rules for automation" ON public.notification_rules
FOR ALL USING (current_setting('role') = 'service_role');

-- 5. Secure Workflow Automations - Admin only  
DROP POLICY IF EXISTS "Service role can manage workflow automations" ON public.workflow_automations;

CREATE POLICY "Service role can manage workflow automations for automation" ON public.workflow_automations
FOR ALL USING (current_setting('role') = 'service_role');

-- 6. Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.security_audit_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Service role can insert audit logs" ON public.security_audit_log
FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

-- 7. Create audit trigger for role changes
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, table_name, record_id, new_values
    ) VALUES (
      NEW.user_id, 'INSERT', 'user_roles', NEW.id, 
      jsonb_build_object('role', NEW.role, 'user_id', NEW.user_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, table_name, record_id, old_values, new_values
    ) VALUES (
      NEW.user_id, 'UPDATE', 'user_roles', NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (
      user_id, action_type, table_name, record_id, old_values
    ) VALUES (
      OLD.user_id, 'DELETE', 'user_roles', OLD.id,
      jsonb_build_object('role', OLD.role, 'user_id', OLD.user_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;