-- Enable required extensions for cron jobs and real-time notifications
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to process automated notifications every 5 minutes
SELECT cron.schedule(
  'process-automated-notifications',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/automated-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
        body:='{"type": "bulk_notifications"}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job to check certificate expiry daily at 9 AM
SELECT cron.schedule(
  'check-certificate-expiry',
  '0 9 * * *', -- daily at 9 AM
  $$
  SELECT
    net.http_post(
        url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/automated-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
        body:='{"type": "certificate_expiry"}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job to send training reminders weekly on Mondays at 10 AM
SELECT cron.schedule(
  'send-training-reminders',
  '0 10 * * 1', -- weekly on Mondays at 10 AM
  $$
  SELECT
    net.http_post(
        url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/automated-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
        body:='{"type": "training_reminders"}'::jsonb
    ) as request_id;
  $$
);

-- Create compliance metrics table for tracking
CREATE TABLE public.compliance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  compliance_score NUMERIC,
  risk_level TEXT DEFAULT 'low',
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage compliance metrics" 
ON public.compliance_metrics 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Organization managers can view their metrics" 
ON public.compliance_metrics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN profiles p ON p.user_id = ur.user_id
  WHERE ur.user_id = auth.uid() 
    AND ur.role = 'dispensary_manager'::app_role 
    AND p.organization_id = compliance_metrics.organization_id
));

CREATE POLICY "Service role can manage compliance metrics" 
ON public.compliance_metrics 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create security events table for real-time monitoring
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  organization_id UUID REFERENCES public.organizations(id),
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'low',
  source_ip TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage security events" 
ON public.security_events 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Service role can manage security events" 
ON public.security_events 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  delivery_method TEXT[] DEFAULT ARRAY['email'],
  frequency TEXT DEFAULT 'immediate',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification preferences" 
ON public.notification_preferences 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Create function to calculate compliance score
CREATE OR REPLACE FUNCTION public.calculate_compliance_score(org_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_employees INTEGER;
  trained_employees INTEGER;
  expired_certificates INTEGER;
  compliance_score NUMERIC;
BEGIN
  -- Get total employees
  SELECT COUNT(*) INTO total_employees
  FROM profiles
  WHERE organization_id = org_id;
  
  -- Get trained employees (completed at least 80% of modules)
  SELECT COUNT(DISTINCT user_id) INTO trained_employees
  FROM user_progress up
  JOIN profiles p ON p.user_id = up.user_id
  WHERE p.organization_id = org_id
    AND up.is_completed = true
  GROUP BY up.user_id
  HAVING COUNT(*) >= 15; -- 80% of 18 modules
  
  -- Get expired certificates
  SELECT COUNT(*) INTO expired_certificates
  FROM certificates c
  JOIN profiles p ON p.user_id = c.user_id
  WHERE p.organization_id = org_id
    AND c.expiry_date < NOW()
    AND c.is_revoked = false;
  
  -- Calculate compliance score (0-100)
  IF total_employees = 0 THEN
    compliance_score := 100;
  ELSE
    compliance_score := (
      (COALESCE(trained_employees, 0)::NUMERIC / total_employees * 70) +
      ((total_employees - COALESCE(expired_certificates, 0))::NUMERIC / total_employees * 30)
    );
  END IF;
  
  RETURN ROUND(compliance_score, 2);
END;
$$;

-- Create function to generate compliance report
CREATE OR REPLACE FUNCTION public.generate_compliance_report(org_id UUID DEFAULT NULL)
RETURNS TABLE(
  organization_name TEXT,
  total_employees INTEGER,
  trained_employees INTEGER,
  completion_rate NUMERIC,
  active_certificates INTEGER,
  expired_certificates INTEGER,
  compliance_score NUMERIC,
  risk_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.name as organization_name,
    COUNT(DISTINCT p.user_id)::INTEGER as total_employees,
    COUNT(DISTINCT CASE 
      WHEN up_count.completed_modules >= 15 THEN p.user_id 
    END)::INTEGER as trained_employees,
    ROUND(
      COUNT(DISTINCT CASE WHEN up_count.completed_modules >= 15 THEN p.user_id END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT p.user_id), 0) * 100, 2
    ) as completion_rate,
    COUNT(DISTINCT CASE 
      WHEN c.expiry_date >= NOW() AND c.is_revoked = false THEN c.id 
    END)::INTEGER as active_certificates,
    COUNT(DISTINCT CASE 
      WHEN c.expiry_date < NOW() AND c.is_revoked = false THEN c.id 
    END)::INTEGER as expired_certificates,
    public.calculate_compliance_score(o.id) as compliance_score,
    CASE 
      WHEN public.calculate_compliance_score(o.id) >= 90 THEN 'low'
      WHEN public.calculate_compliance_score(o.id) >= 70 THEN 'medium'
      ELSE 'high'
    END as risk_level
  FROM organizations o
  LEFT JOIN profiles p ON p.organization_id = o.id
  LEFT JOIN certificates c ON c.user_id = p.user_id
  LEFT JOIN (
    SELECT 
      user_id, 
      COUNT(*) as completed_modules 
    FROM user_progress 
    WHERE is_completed = true 
    GROUP BY user_id
  ) up_count ON up_count.user_id = p.user_id
  WHERE (org_id IS NULL OR o.id = org_id)
    AND o.admin_approved = true
  GROUP BY o.id, o.name;
END;
$$;

-- Create audit trigger for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enhanced audit logging for sensitive operations
  INSERT INTO security_audit_log (
    user_id,
    table_name,
    action_type,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    current_setting('request.headers', true)::jsonb->>'user-agent',
    now()
  );
  
  -- Log security events for critical operations
  IF TG_TABLE_NAME IN ('user_roles', 'organizations', 'certificates') THEN
    INSERT INTO security_events (
      user_id,
      event_type,
      severity,
      details,
      created_at
    ) VALUES (
      auth.uid(),
      TG_TABLE_NAME || '_' || LOWER(TG_OP),
      CASE 
        WHEN TG_TABLE_NAME = 'user_roles' THEN 'high'
        WHEN TG_TABLE_NAME = 'certificates' AND TG_OP = 'UPDATE' THEN 'medium'
        ELSE 'low'
      END,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', COALESCE(NEW.id, OLD.id)
      ),
      now()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_user_roles ON user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_organizations ON organizations;
CREATE TRIGGER audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operations();

DROP TRIGGER IF EXISTS audit_certificates ON certificates;
CREATE TRIGGER audit_certificates
  AFTER INSERT OR UPDATE OR DELETE ON certificates
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operations();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_org_date ON compliance_metrics(organization_id, calculation_date);
CREATE INDEX IF NOT EXISTS idx_security_events_user_date ON security_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON security_events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_type ON notification_preferences(user_id, notification_type);

-- Create updated_at triggers
CREATE TRIGGER update_compliance_metrics_updated_at
  BEFORE UPDATE ON compliance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();