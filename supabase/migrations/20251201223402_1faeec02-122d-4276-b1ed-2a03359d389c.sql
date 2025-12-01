-- ============================================================
-- Advanced Communication Hub Features Migration
-- ============================================================

-- Feature 1: Message Mentions (@mentions)
-- ============================================================
CREATE TABLE message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

ALTER TABLE message_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions in their conversations"
  ON message_mentions FOR SELECT
  USING (
    mentioned_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_mentions.message_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mentions"
  ON message_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE m.id = message_mentions.message_id
      AND cp.user_id = auth.uid()
    )
  );

ALTER TABLE message_mentions REPLICA IDENTITY FULL;

-- Feature 2: Scheduled Calls
-- ============================================================
CREATE TABLE scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'started', 'ended', 'cancelled')),
  recurring_pattern JSONB,
  reminder_sent BOOLEAN DEFAULT false,
  video_call_id UUID REFERENCES video_calls(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scheduled_call_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_call_id UUID NOT NULL REFERENCES scheduled_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scheduled_call_id, user_id)
);

ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_call_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calls they host or are invited to"
  ON scheduled_calls FOR SELECT
  USING (
    host_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM scheduled_call_invites
      WHERE scheduled_call_id = scheduled_calls.id
      AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = scheduled_calls.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can manage their calls"
  ON scheduled_calls FOR ALL
  USING (host_id = auth.uid());

CREATE POLICY "Users can view their invites"
  ON scheduled_call_invites FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM scheduled_calls sc WHERE sc.id = scheduled_call_id AND sc.host_id = auth.uid()
  ));

CREATE POLICY "Users can respond to their invites"
  ON scheduled_call_invites FOR UPDATE
  USING (user_id = auth.uid());

ALTER TABLE scheduled_calls REPLICA IDENTITY FULL;
ALTER TABLE scheduled_call_invites REPLICA IDENTITY FULL;

-- Feature 3: Push Notifications
-- ============================================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid());

-- Feature 4: Recording Storage
-- ============================================================
ALTER TABLE video_calls 
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS recording_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS recording_size_mb DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT 'none' 
    CHECK (recording_status IN ('none', 'recording', 'processing', 'ready', 'failed')),
  ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recording_egress_id TEXT;

-- Create recordings storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for recordings
CREATE POLICY "Users can view recordings from their calls"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'call-recordings' AND
    EXISTS (
      SELECT 1 FROM video_calls vc
      JOIN video_call_participants vcp ON vcp.call_id = vc.id
      WHERE vc.room_name = (storage.foldername(name))[1]
      AND vcp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can upload recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'call-recordings');