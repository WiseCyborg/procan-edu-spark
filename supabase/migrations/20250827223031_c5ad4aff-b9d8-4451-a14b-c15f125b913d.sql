-- Create comprehensive notification and workflow tables
CREATE TABLE public.notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  enabled boolean DEFAULT true,
  trigger_days integer DEFAULT 7,
  message_template text NOT NULL,
  escalation_enabled boolean DEFAULT false,
  escalation_levels jsonb DEFAULT '[]'::jsonb,
  target_roles text[] DEFAULT ARRAY['student'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.notification_rules(id),
  user_id UUID,
  organization_id UUID REFERENCES public.organizations(id),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status text DEFAULT 'pending',
  priority text DEFAULT 'medium',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  inviter_id UUID,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'student',
  invitation_token text NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.communication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  organization_id UUID REFERENCES public.organizations(id),
  communication_type text NOT NULL,
  subject text,
  content text,
  recipient_email text NOT NULL,
  delivery_status text DEFAULT 'pending',
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.workflow_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_conditions jsonb NOT NULL,
  actions jsonb NOT NULL,
  enabled boolean DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_rules
CREATE POLICY "Admins can manage notification rules" ON public.notification_rules
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- RLS Policies for notification_queue  
CREATE POLICY "Admins can view all notifications" ON public.notification_queue
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

CREATE POLICY "Organization managers can view their notifications" ON public.notification_queue
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'dispensary_manager'::app_role 
    AND p.organization_id = notification_queue.organization_id
  )
);

-- RLS Policies for staff_invitations
CREATE POLICY "Organization managers can manage invitations" ON public.staff_invitations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'dispensary_manager'::app_role 
    AND p.organization_id = staff_invitations.organization_id
  )
  OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)
);

-- RLS Policies for communication_logs
CREATE POLICY "Admins can view all communication logs" ON public.communication_logs
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

CREATE POLICY "Organization managers can view their logs" ON public.communication_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'dispensary_manager'::app_role 
    AND p.organization_id = communication_logs.organization_id
  )
);

-- RLS Policies for workflow_automations
CREATE POLICY "Admins can manage workflow automations" ON public.workflow_automations
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- Service role policies for automated operations
CREATE POLICY "Service role can manage all notification data" ON public.notification_rules FOR ALL USING (true);
CREATE POLICY "Service role can manage notification queue" ON public.notification_queue FOR ALL USING (true);
CREATE POLICY "Service role can manage staff invitations" ON public.staff_invitations FOR ALL USING (true);
CREATE POLICY "Service role can manage communication logs" ON public.communication_logs FOR ALL USING (true);
CREATE POLICY "Service role can manage workflow automations" ON public.workflow_automations FOR ALL USING (true);

-- Create trigger for updated_at columns
CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_automations_updated_at
  BEFORE UPDATE ON public.workflow_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate invitation tokens
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  token TEXT;
BEGIN
  token := 'INV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 16));
  RETURN token;
END;
$$;

-- Insert default notification rules
INSERT INTO public.notification_rules (type, message_template, trigger_days, escalation_enabled, target_roles) VALUES
('certificate_expiry', 'Your cannabis training certificate expires in {days} days. Please renew to maintain compliance.', 30, true, ARRAY['student']),
('training_deadline', 'You have {days} days remaining to complete your required cannabis training modules.', 7, true, ARRAY['student']),
('compliance_check', 'Compliance review required: {details}', 5, true, ARRAY['dispensary_manager']),
('payment_reminder', 'Training program payment is due in {days} days for {organization}.', 7, false, ARRAY['dispensary_manager']),
('course_incomplete', 'You have incomplete training modules that must be completed for compliance.', 14, true, ARRAY['student']),
('staff_onboarding', 'Welcome to the cannabis training program. Please complete your profile and begin training.', 0, false, ARRAY['student']),
('certificate_renewal', 'Your certificate is due for renewal. Click here to start the renewal process.', 60, true, ARRAY['student']),
('organization_compliance', 'Your organization has {count} employees with pending compliance requirements.', 3, true, ARRAY['dispensary_manager', 'admin']);

-- Insert default workflow automations
INSERT INTO public.workflow_automations (name, trigger_type, trigger_conditions, actions, created_by) VALUES
('Certificate Expiry Reminder', 'scheduled', 
 '{"frequency": "daily", "time": "09:00"}',
 '{"send_notification": {"rule_type": "certificate_expiry", "advance_days": [30, 14, 7, 1]}}',
 NULL),
('New Employee Onboarding', 'user_registered',
 '{"has_organization": true, "role": "student"}',
 '{"send_email": {"template": "welcome_employee", "delay_hours": 1}}',
 NULL),
('Compliance Check Weekly', 'scheduled',
 '{"frequency": "weekly", "day": "monday", "time": "08:00"}',
 '{"generate_compliance_report": {"send_to": "managers"}}',
 NULL);