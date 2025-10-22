-- Support Queue for human escalation
CREATE TABLE support_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  request_type TEXT CHECK (request_type IN ('general', 'technical', 'billing', 'compliance', 'urgent')) DEFAULT 'general',
  message TEXT NOT NULL,
  chat_context JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'closed')) DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Console Audit for command tracking
CREATE TABLE api_console_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  command TEXT NOT NULL,
  api_route TEXT NOT NULL,
  request_params JSONB,
  response_data JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Intent Log for ML tracking
CREATE TABLE chat_intent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID,
  user_message TEXT NOT NULL,
  detected_intent TEXT CHECK (detected_intent IN ('api_command', 'human_escalation', 'faq', 'general_help', 'unclear')) NOT NULL,
  confidence_score NUMERIC(3, 2),
  chosen_mode TEXT CHECK (chosen_mode IN ('console', 'human', 'ai_assist')) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_support_queue_status ON support_queue(status, created_at DESC);
CREATE INDEX idx_support_queue_assigned ON support_queue(assigned_to, status);
CREATE INDEX idx_api_audit_user ON api_console_audit(user_id, created_at DESC);
CREATE INDEX idx_api_audit_route ON api_console_audit(api_route, success);
CREATE INDEX idx_intent_log_session ON chat_intent_log(chat_session_id);

-- RLS Policies
ALTER TABLE support_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tickets" ON support_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Support staff view assigned tickets" ON support_queue
  FOR SELECT USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users create tickets" ON support_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Support staff update tickets" ON support_queue
  FOR UPDATE USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- API Audit policies
ALTER TABLE api_console_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own audit logs" ON api_console_audit
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all audit logs" ON api_console_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Service role manages audit" ON api_console_audit
  FOR INSERT WITH CHECK (true);

-- Intent Log policy
ALTER TABLE chat_intent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages intent logs" ON chat_intent_log
  FOR ALL USING (true);

-- Enable realtime for support queue
ALTER TABLE support_queue REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE support_queue;