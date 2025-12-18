-- Avatar Prompts table for admin-editable scripts
CREATE TABLE IF NOT EXISTS public.avatar_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('admin', 'manager', 'student', 'public', 'system')),
  trigger TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}',
  template TEXT NOT NULL,
  gaze_target TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatar_prompts ENABLE ROW LEVEL SECURITY;

-- Admins can manage prompts (using user_roles table)
CREATE POLICY "Admins can manage avatar prompts"
ON public.avatar_prompts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Everyone can read active prompts
CREATE POLICY "Anyone can read active avatar prompts"
ON public.avatar_prompts
FOR SELECT
USING (is_active = true);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_avatar_prompts_trigger ON public.avatar_prompts(trigger);
CREATE INDEX IF NOT EXISTS idx_avatar_prompts_category ON public.avatar_prompts(category);

-- Add avatar agent to agent_configs if not exists
INSERT INTO public.agent_configs (agent_type, is_enabled, thresholds, schedule_cron)
VALUES (
  'avatar-agent',
  true,
  '{"voice": "nova", "auto_trigger": true, "max_messages_per_session": 5}'::jsonb,
  NULL
)
ON CONFLICT (agent_type) DO NOTHING;