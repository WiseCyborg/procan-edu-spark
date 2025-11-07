-- Create ailean_sessions table for conversation history
CREATE TABLE IF NOT EXISTS public.ailean_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  scenario_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ailean_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own AiLean sessions"
  ON public.ailean_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create their own AiLean sessions"
  ON public.ailean_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own AiLean sessions"
  ON public.ailean_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete their own AiLean sessions"
  ON public.ailean_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all AiLean sessions"
  ON public.ailean_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_ailean_sessions_user_id ON public.ailean_sessions(user_id);
CREATE INDEX idx_ailean_sessions_updated_at ON public.ailean_sessions(updated_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_ailean_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ailean_sessions_updated_at
  BEFORE UPDATE ON public.ailean_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_ailean_sessions_updated_at();

-- Create ailean_activation_tokens table for mobile activation
CREATE TABLE IF NOT EXISTS public.ailean_activation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  uses_remaining INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ailean_activation_tokens ENABLE ROW LEVEL SECURITY;

-- Organization managers can create tokens
CREATE POLICY "Organization managers can create activation tokens"
  ON public.ailean_activation_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator')
      AND p.organization_id = ailean_activation_tokens.organization_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Organization managers can view their tokens
CREATE POLICY "Organization managers can view their activation tokens"
  ON public.ailean_activation_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator', 'admin')
      AND (p.organization_id = ailean_activation_tokens.organization_id OR ur.role = 'admin')
    )
  );

-- Organization managers can update their tokens
CREATE POLICY "Organization managers can update their activation tokens"
  ON public.ailean_activation_tokens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator')
      AND p.organization_id = ailean_activation_tokens.organization_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Organization managers can delete their tokens
CREATE POLICY "Organization managers can delete their activation tokens"
  ON public.ailean_activation_tokens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator')
      AND p.organization_id = ailean_activation_tokens.organization_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Service role can manage tokens (for edge functions)
CREATE POLICY "Service role can manage activation tokens"
  ON public.ailean_activation_tokens
  FOR ALL
  USING (current_setting('role') = 'service_role');

-- Create indexes
CREATE INDEX idx_ailean_activation_tokens_org ON public.ailean_activation_tokens(organization_id);
CREATE INDEX idx_ailean_activation_tokens_token ON public.ailean_activation_tokens(token);
CREATE INDEX idx_ailean_activation_tokens_expires ON public.ailean_activation_tokens(expires_at);