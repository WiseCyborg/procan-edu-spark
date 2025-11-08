-- Phase 8: Email Preferences Table
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receive_marketing BOOLEAN DEFAULT true,
  receive_reminders BOOLEAN DEFAULT true,
  receive_deadlines BOOLEAN DEFAULT true,
  receive_achievements BOOLEAN DEFAULT true,
  frequency TEXT DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for email preferences
CREATE POLICY "Users can view own preferences"
  ON public.email_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 6: Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);

-- Phase 5: Escalation tracking
CREATE TABLE IF NOT EXISTS public.escalation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escalation_type TEXT NOT NULL CHECK (escalation_type IN ('invitation_ignored', 'stalled_learner', 'deadline_approaching')),
  escalation_level INTEGER DEFAULT 1,
  last_escalation_at TIMESTAMPTZ DEFAULT now(),
  notified_manager BOOLEAN DEFAULT false,
  notified_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalation_log_user ON public.escalation_log(user_id);

-- Function to check user email preferences
CREATE OR REPLACE FUNCTION public.check_email_preference(
  p_user_id UUID,
  p_email_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_preference BOOLEAN;
BEGIN
  -- Get user preference for this email type
  SELECT CASE p_email_type
    WHEN 'marketing' THEN receive_marketing
    WHEN 'reminders' THEN receive_reminders
    WHEN 'deadlines' THEN receive_deadlines
    WHEN 'achievements' THEN receive_achievements
    ELSE true -- Default to true for critical emails
  END INTO v_preference
  FROM public.email_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences set, default to true
  RETURN COALESCE(v_preference, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;