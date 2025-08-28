-- SECURITY ENHANCEMENTS: Business Logic Protection & Audit Logging (Fixed)

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_log;

-- Recreate audit log policies
CREATE POLICY "Admins can view audit logs" ON public.security_audit_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Service role can insert audit logs" ON public.security_audit_log
FOR INSERT WITH CHECK (
  current_setting('role') = 'service_role'
);

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log changes to sensitive tables
  IF TG_TABLE_NAME IN ('notification_rules', 'workflow_automations', 'user_roles', 'certificates') THEN
    INSERT INTO public.security_audit_log (
      user_id,
      table_name,
      action_type,
      record_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      auth.uid(),
      TG_TABLE_NAME,
      TG_OP,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_notification_rules ON public.notification_rules;
DROP TRIGGER IF EXISTS audit_workflow_automations ON public.workflow_automations;
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
DROP TRIGGER IF EXISTS audit_certificates_changes ON public.certificates;

-- Create audit triggers for sensitive tables
CREATE TRIGGER audit_notification_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

CREATE TRIGGER audit_workflow_automations
  AFTER INSERT OR UPDATE OR DELETE ON public.workflow_automations
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

CREATE TRIGGER audit_certificates_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

-- Enhanced organization-specific access for notification rules
DROP POLICY IF EXISTS "Admins can manage notification rules" ON public.notification_rules;
DROP POLICY IF EXISTS "Admins can manage all notification rules" ON public.notification_rules;
DROP POLICY IF EXISTS "Organization managers can view org-specific rules" ON public.notification_rules;

CREATE POLICY "Admins can manage all notification rules" ON public.notification_rules
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Organization managers can view org-specific rules" ON public.notification_rules
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'dispensary_manager'::app_role
    AND p.organization_id IS NOT NULL
  )
);

-- Enhanced organization-specific access for workflow automations
DROP POLICY IF EXISTS "Admins can manage workflow automations" ON public.workflow_automations;
DROP POLICY IF EXISTS "Admins can manage all workflow automations" ON public.workflow_automations;

CREATE POLICY "Admins can manage all workflow automations" ON public.workflow_automations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing rate limit policy if exists
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
FOR ALL USING (true);

-- Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _action_type TEXT,
  _max_requests INTEGER DEFAULT 10,
  _window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start time
  window_start := date_trunc('hour', now()) + 
    (EXTRACT(minute FROM now())::INTEGER / _window_minutes) * 
    (_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current count for this window
  SELECT COALESCE(request_count, 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = _user_id 
    AND action_type = _action_type 
    AND window_start = window_start;
  
  -- Check if limit exceeded
  IF current_count >= _max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO public.rate_limits (user_id, action_type, request_count, window_start)
  VALUES (_user_id, _action_type, current_count + 1, window_start)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type TEXT,
  _details JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    table_name,
    action_type,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    'security_events',
    _event_type,
    _details,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;