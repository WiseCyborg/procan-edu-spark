-- Create user_learning_journey table for lifecycle tracking
CREATE TABLE user_learning_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  
  -- Current stage in lifecycle
  current_stage TEXT CHECK (current_stage IN (
    'application_submitted',
    'account_created',
    'profile_incomplete',
    'profile_complete',
    'course_not_started',
    'course_in_progress',
    'course_stuck',
    'course_nearing_completion',
    'course_completed',
    'exam_not_attempted',
    'exam_in_progress',
    'exam_failed',
    'exam_passed',
    'certificate_issued',
    'certificate_expiring',
    'certificate_expired',
    'renewal_in_progress'
  )) DEFAULT 'account_created',
  
  -- Timestamps
  stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Progress metrics
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  modules_completed INTEGER DEFAULT 0,
  exam_attempts INTEGER DEFAULT 0,
  last_exam_score INTEGER,
  
  -- Intervention tracking
  interventions_sent INTEGER DEFAULT 0,
  last_intervention_at TIMESTAMP WITH TIME ZONE,
  intervention_types JSONB DEFAULT '[]'::jsonb,
  
  -- Risk flags
  at_risk_flag BOOLEAN DEFAULT FALSE,
  risk_factors JSONB DEFAULT '{}'::jsonb,
  
  -- AI-generated insights
  ai_recommendations TEXT,
  predicted_completion_date DATE,
  success_probability NUMERIC(3, 2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_learning_journey_user ON user_learning_journey(user_id);
CREATE INDEX idx_learning_journey_org ON user_learning_journey(organization_id);
CREATE INDEX idx_learning_journey_stage ON user_learning_journey(current_stage);
CREATE INDEX idx_learning_journey_at_risk ON user_learning_journey(at_risk_flag) WHERE at_risk_flag = true;
CREATE INDEX idx_learning_journey_activity ON user_learning_journey(last_activity_at);

-- RLS Policies
ALTER TABLE user_learning_journey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own journey"
  ON user_learning_journey FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all journeys"
  ON user_learning_journey FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordinators view org journeys"
  ON user_learning_journey FOR SELECT
  USING (
    has_role(auth.uid(), 'training_coordinator')
    AND organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers view org journeys"
  ON user_learning_journey FOR SELECT
  USING (
    has_role(auth.uid(), 'dispensary_manager')
    AND organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role updates journeys"
  ON user_learning_journey FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- Trigger to initialize learning journey on profile creation
CREATE OR REPLACE FUNCTION initialize_learning_journey()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_learning_journey (
    user_id,
    organization_id,
    current_stage,
    stage_entered_at,
    last_activity_at
  ) VALUES (
    NEW.user_id,
    NEW.organization_id,
    CASE 
      WHEN NEW.first_name IS NULL OR NEW.last_name IS NULL THEN 'profile_incomplete'
      ELSE 'profile_complete'
    END,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_learning_journey();

-- Trigger to update learning journey on user_progress changes
CREATE OR REPLACE FUNCTION update_learning_journey_on_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_modules INTEGER := 20;
  completed_count INTEGER;
  completion_pct INTEGER;
  new_stage TEXT;
  days_since_activity INTEGER;
BEGIN
  -- Count completed modules for this user
  SELECT COUNT(*) INTO completed_count
  FROM user_progress
  WHERE user_id = NEW.user_id AND is_completed = true;
  
  -- Calculate completion percentage
  completion_pct := (completed_count * 100) / total_modules;
  
  -- Determine new stage
  IF completion_pct = 0 THEN
    new_stage := 'course_not_started';
  ELSIF completion_pct < 80 THEN
    new_stage := 'course_in_progress';
  ELSIF completion_pct < 100 THEN
    new_stage := 'course_nearing_completion';
  ELSE
    new_stage := 'course_completed';
  END IF;
  
  -- Update learning journey
  UPDATE user_learning_journey
  SET 
    current_stage = new_stage,
    completion_percentage = completion_pct,
    modules_completed = completed_count,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_progress_updated
  AFTER INSERT OR UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_journey_on_progress();