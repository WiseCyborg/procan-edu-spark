-- ================================================================
-- USER JOURNEY STATE AGENT: Track user progress and wizard state
-- Enables smart resume prompts and intelligent navigation
-- ================================================================

CREATE TABLE user_journey_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Journey Stage (covers entire lifecycle)
  current_stage TEXT NOT NULL DEFAULT 'new_user',
  -- Stages: new_user, profile_incomplete, onboarding_in_progress, 
  --         onboarding_complete, course_in_progress, course_complete,
  --         certified, renewal_due
  
  -- Sub-stage tracking (for wizards)
  current_wizard TEXT, -- 'manager_onboarding', 'profile_setup', 'course_module'
  current_step INTEGER DEFAULT 1,
  wizard_metadata JSONB DEFAULT '{}',
  
  -- Navigation tracking
  last_page_visited TEXT,
  last_action TEXT,
  
  -- Timing
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Smart messaging
  welcome_message_shown BOOLEAN DEFAULT false,
  resume_prompt_count INTEGER DEFAULT 0,
  last_resume_prompt_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_journey_state ENABLE ROW LEVEL SECURITY;

-- Users can manage their own journey state
CREATE POLICY "Users can view own journey state"
  ON user_journey_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journey state"
  ON user_journey_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journey state"
  ON user_journey_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all journey states
CREATE POLICY "Admins can view all journey states"
  ON user_journey_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for fast lookups
CREATE INDEX idx_journey_state_user_id ON user_journey_state(user_id);
CREATE INDEX idx_journey_state_stage ON user_journey_state(current_stage);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_journey_state_updated_at
  BEFORE UPDATE ON user_journey_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();