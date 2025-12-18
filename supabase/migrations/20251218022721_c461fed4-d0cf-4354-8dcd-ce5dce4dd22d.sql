-- Agent-Covered Sessions Schema

-- Main sessions table
CREATE TABLE public.covered_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('training', 'uat', 'admin_ops', 'onboarding', 'support', 'general')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  host_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  video_call_id UUID REFERENCES public.video_calls(id),
  conversation_id UUID REFERENCES public.conversations(id),
  
  -- Settings
  record_audio BOOLEAN DEFAULT true,
  transcribe BOOLEAN DEFAULT true,
  generate_summary BOOLEAN DEFAULT true,
  track_actions BOOLEAN DEFAULT true,
  
  -- Context
  pre_meeting_context JSONB,
  related_pipeline_stage TEXT,
  related_module_id UUID,
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session participants
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.covered_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  participant_name TEXT NOT NULL,
  participant_role TEXT CHECK (participant_role IN ('admin', 'manager', 'trainer', 'employee', 'guest')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  consent_given BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session transcripts
CREATE TABLE public.session_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.covered_sessions(id) ON DELETE CASCADE,
  speaker_name TEXT,
  speaker_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  timestamp_start DECIMAL NOT NULL,
  timestamp_end DECIMAL,
  confidence DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session summaries
CREATE TABLE public.session_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.covered_sessions(id) ON DELETE CASCADE,
  executive_summary TEXT,
  key_outcomes JSONB,
  risks_identified JSONB,
  topics_discussed JSONB,
  duration_minutes INTEGER,
  participant_count INTEGER,
  generated_at TIMESTAMPTZ DEFAULT now(),
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session action items
CREATE TABLE public.session_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.covered_sessions(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  owner_name TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  linked_org_id UUID REFERENCES public.organizations(id),
  linked_module_id UUID,
  linked_pipeline_stage TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session decisions
CREATE TABLE public.session_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.covered_sessions(id) ON DELETE CASCADE,
  decision_text TEXT NOT NULL,
  decided_by TEXT,
  decided_by_id UUID REFERENCES auth.users(id),
  impacted_pipeline TEXT,
  impacted_org_id UUID REFERENCES public.organizations(id),
  context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.covered_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for covered_sessions
CREATE POLICY "Users can view sessions they host or participate in"
  ON public.covered_sessions FOR SELECT
  USING (
    host_id = auth.uid() OR
    EXISTS (SELECT 1 FROM session_participants WHERE session_id = id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'training_coordinator'))
  );

CREATE POLICY "Users can create sessions"
  ON public.covered_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts and admins can update sessions"
  ON public.covered_sessions FOR UPDATE
  USING (
    host_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS for session_participants
CREATE POLICY "Users can view participants of their sessions"
  ON public.session_participants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM covered_sessions WHERE id = session_id AND (
      host_id = auth.uid() OR
      EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = session_participants.session_id AND sp.user_id = auth.uid())
    )) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'training_coordinator'))
  );

CREATE POLICY "Session hosts can manage participants"
  ON public.session_participants FOR ALL
  USING (
    EXISTS (SELECT 1 FROM covered_sessions WHERE id = session_id AND host_id = auth.uid()) OR
    user_id = auth.uid()
  );

-- RLS for transcripts, summaries, actions, decisions (similar pattern)
CREATE POLICY "Users can view session transcripts"
  ON public.session_transcripts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM covered_sessions WHERE id = session_id AND (
      host_id = auth.uid() OR
      EXISTS (SELECT 1 FROM session_participants WHERE session_id = session_transcripts.session_id AND user_id = auth.uid())
    )) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'training_coordinator'))
  );

CREATE POLICY "Users can view session summaries"
  ON public.session_summaries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM covered_sessions WHERE id = session_id AND (
      host_id = auth.uid() OR
      EXISTS (SELECT 1 FROM session_participants WHERE session_id = session_summaries.session_id AND user_id = auth.uid())
    )) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'training_coordinator'))
  );

CREATE POLICY "Users can view session actions"
  ON public.session_actions FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM covered_sessions WHERE id = session_id AND host_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'training_coordinator'))
  );

CREATE POLICY "Users can update their own actions"
  ON public.session_actions FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM covered_sessions WHERE id = session_id AND host_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view session decisions"
  ON public.session_decisions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM covered_sessions WHERE id = session_id AND (
      host_id = auth.uid() OR
      EXISTS (SELECT 1 FROM session_participants WHERE session_id = session_decisions.session_id AND user_id = auth.uid())
    )) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'training_coordinator'))
  );

-- Indexes
CREATE INDEX idx_covered_sessions_host ON public.covered_sessions(host_id);
CREATE INDEX idx_covered_sessions_org ON public.covered_sessions(organization_id);
CREATE INDEX idx_covered_sessions_status ON public.covered_sessions(status);
CREATE INDEX idx_session_participants_session ON public.session_participants(session_id);
CREATE INDEX idx_session_participants_user ON public.session_participants(user_id);
CREATE INDEX idx_session_transcripts_session ON public.session_transcripts(session_id);
CREATE INDEX idx_session_actions_owner ON public.session_actions(owner_id);
CREATE INDEX idx_session_actions_status ON public.session_actions(status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.covered_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_actions;