-- Phase 1: Database Schema Updates for Teams/Zoom-style Communication Hub

-- Extend conversation types to include orientation, uat, study_help, live_training
ALTER TABLE conversations 
  DROP CONSTRAINT IF EXISTS conversations_conversation_type_check,
  ADD CONSTRAINT conversations_conversation_type_check 
  CHECK (conversation_type IN ('direct', 'group', 'announcement', 'orientation', 'uat', 'study_help', 'live_training'));

-- Add channel metadata columns
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS channel_category TEXT CHECK (channel_category IN ('general', 'study', 'training', 'uat', 'orientation')),
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_call_id UUID REFERENCES video_calls(id);

-- Create typing indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Typing indicators policies
CREATE POLICY "Users can insert their own typing indicators"
  ON typing_indicators FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view typing indicators in their conversations"
  ON typing_indicators FOR SELECT
  USING (is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can delete their own typing indicators"
  ON typing_indicators FOR DELETE
  USING (user_id = auth.uid());

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '🎉', '😂', '😮', '😢', '🙏', '🔥')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Message reactions policies
CREATE POLICY "Users can add reactions to messages they can see"
  ON message_reactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_reactions.message_id
      AND is_conversation_participant(auth.uid(), c.id)
    )
  );

CREATE POLICY "Users can view reactions on messages they can see"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_reactions.message_id
      AND is_conversation_participant(auth.uid(), c.id)
    )
  );

CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user ON typing_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_conversations_active_call ON conversations(active_call_id) WHERE active_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(channel_category) WHERE channel_category IS NOT NULL;

-- Add helpful comments
COMMENT ON TABLE typing_indicators IS 'Real-time typing indicators for conversations';
COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages (Teams/Slack-style)';
COMMENT ON COLUMN conversations.channel_category IS 'Category for organizing channels in sidebar';
COMMENT ON COLUMN conversations.is_pinned IS 'Pin important channels to top of sidebar';
COMMENT ON COLUMN conversations.active_call_id IS 'Reference to currently active video call in this channel';