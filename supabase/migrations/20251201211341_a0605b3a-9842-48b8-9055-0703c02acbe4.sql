-- Add training_questions table for Live Training Room Q&A persistence
CREATE TABLE IF NOT EXISTS public.training_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  answered_by UUID,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_answered_by FOREIGN KEY (answered_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add index for faster queries
CREATE INDEX idx_training_questions_conversation ON public.training_questions(conversation_id);
CREATE INDEX idx_training_questions_status ON public.training_questions(status);
CREATE INDEX idx_training_questions_created_at ON public.training_questions(created_at DESC);

-- Enable RLS
ALTER TABLE public.training_questions ENABLE ROW LEVEL SECURITY;

-- Policies for training questions
CREATE POLICY "Users can view questions in their conversations"
  ON public.training_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = training_questions.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create questions in their conversations"
  ON public.training_questions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = training_questions.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can mark questions as answered"
  ON public.training_questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = training_questions.conversation_id
      AND c.created_by = auth.uid()
    )
  );

-- Add real-time subscription
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_questions;