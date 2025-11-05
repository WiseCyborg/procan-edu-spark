-- Enhanced regulatory content tracking
ALTER TABLE regulatory_content 
  ADD COLUMN IF NOT EXISTS plain_language_summary TEXT,
  ADD COLUMN IF NOT EXISTS compliance_tips JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related_case_studies UUID[],
  ADD COLUMN IF NOT EXISTS last_mca_review_date DATE,
  ADD COLUMN IF NOT EXISTS change_impact_level TEXT DEFAULT 'minor' CHECK (change_impact_level IN ('minor', 'moderate', 'major', 'critical'));

-- Student regulatory version tracking
CREATE TABLE IF NOT EXISTS student_certification_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  module_id UUID REFERENCES course_modules NOT NULL,
  comar_version_hash TEXT NOT NULL,
  certified_at TIMESTAMPTZ NOT NULL,
  requires_update BOOLEAN DEFAULT false,
  update_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Regulatory change notifications
CREATE TABLE IF NOT EXISTS regulatory_change_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  comar_section TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('new', 'modified', 'deleted')),
  change_summary TEXT NOT NULL,
  requires_recertification BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_cert_versions_user ON student_certification_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_student_cert_versions_module ON student_certification_versions(module_id);
CREATE INDEX IF NOT EXISTS idx_reg_notifications_user ON regulatory_change_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reg_notifications_acknowledged ON regulatory_change_notifications(acknowledged_at) WHERE acknowledged_at IS NULL;

-- RLS Policies
ALTER TABLE student_certification_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_change_notifications ENABLE ROW LEVEL SECURITY;

-- Students can view their own certification versions
CREATE POLICY "Users view own certification versions" ON student_certification_versions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage certification versions
CREATE POLICY "Service role manages certification versions" ON student_certification_versions
  FOR ALL USING (current_setting('role'::text) = 'service_role'::text);

-- Admins can view all certification versions
CREATE POLICY "Admins view all certification versions" ON student_certification_versions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Students can view and acknowledge their own notifications
CREATE POLICY "Users view own notifications" ON regulatory_change_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users acknowledge own notifications" ON regulatory_change_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can manage notifications
CREATE POLICY "Service role manages notifications" ON regulatory_change_notifications
  FOR ALL USING (current_setting('role'::text) = 'service_role'::text);

-- Admins can view all notifications
CREATE POLICY "Admins view all notifications" ON regulatory_change_notifications
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));