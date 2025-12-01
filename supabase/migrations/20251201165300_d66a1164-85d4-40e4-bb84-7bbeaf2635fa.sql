CREATE TABLE video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  call_type TEXT CHECK (call_type IN ('training', 'orientation', 'uat', 'one_on_one', 'study_session')),
  host_id UUID NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  max_participants INTEGER DEFAULT 50,
  is_recording BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE video_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES video_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  role TEXT CHECK (role IN ('host', 'co_host', 'participant')) DEFAULT 'participant',
  UNIQUE(call_id, user_id)
);

CREATE INDEX idx_video_calls_room_name ON video_calls(room_name);
CREATE INDEX idx_video_calls_host_id ON video_calls(host_id);
CREATE INDEX idx_video_calls_conversation_id ON video_calls(conversation_id);
CREATE INDEX idx_video_calls_organization_id ON video_calls(organization_id);
CREATE INDEX idx_video_call_participants_call_id ON video_call_participants(call_id);
CREATE INDEX idx_video_call_participants_user_id ON video_call_participants(user_id);

ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_call_participants ENABLE ROW LEVEL SECURITY;