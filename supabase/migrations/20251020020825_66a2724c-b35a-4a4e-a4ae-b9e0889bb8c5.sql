-- PHASE 2: Email Template Management Tables

-- Email templates table for storing template content in database
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text UNIQUE NOT NULL,
  subject_line text NOT NULL,
  html_content text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Template version history for tracking changes
CREATE TABLE public.email_template_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.email_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  html_content text NOT NULL,
  subject_line text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  change_reason text,
  created_at timestamptz DEFAULT now()
);

-- Email provider health tracking
CREATE TABLE public.email_provider_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('online', 'degraded', 'offline')),
  response_time_ms integer,
  last_check_at timestamptz DEFAULT now(),
  last_success_at timestamptz,
  error_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_email_templates_name ON public.email_templates(template_name);
CREATE INDEX idx_email_templates_active ON public.email_templates(is_active);
CREATE INDEX idx_email_template_history_template ON public.email_template_history(template_id);
CREATE INDEX idx_email_provider_health_provider ON public.email_provider_health(provider_name);
CREATE INDEX idx_email_provider_health_check ON public.email_provider_health(last_check_at DESC);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_provider_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage templates"
ON public.email_templates FOR ALL
USING (current_setting('role') = 'service_role');

-- RLS Policies for email_template_history
CREATE POLICY "Admins can view template history"
ON public.email_template_history FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage template history"
ON public.email_template_history FOR ALL
USING (current_setting('role') = 'service_role');

-- RLS Policies for email_provider_health
CREATE POLICY "Admins can view provider health"
ON public.email_provider_health FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage provider health"
ON public.email_provider_health FOR ALL
USING (current_setting('role') = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to save template history before update
CREATE OR REPLACE FUNCTION public.save_email_template_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.html_content IS DISTINCT FROM NEW.html_content OR OLD.subject_line IS DISTINCT FROM NEW.subject_line) THEN
    INSERT INTO public.email_template_history (
      template_id,
      version,
      html_content,
      subject_line,
      changed_by
    ) VALUES (
      OLD.id,
      OLD.version,
      OLD.html_content,
      OLD.subject_line,
      auth.uid()
    );
    
    NEW.version := OLD.version + 1;
    NEW.updated_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER save_template_history_on_update
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.save_email_template_history();