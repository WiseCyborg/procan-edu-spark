-- Create support requests table for ProCann live support escalation
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('chat_escalation', 'video_call_request', 'general_inquiry')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'resolved', 'cancelled')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject TEXT NOT NULL,
  description TEXT,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  scheduled_call_time TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create support request messages table for threaded conversations
CREATE TABLE IF NOT EXISTS public.support_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_request_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_requests
CREATE POLICY "Users can view their own support requests"
  ON public.support_requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Admins can view all support requests"
  ON public.support_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create support requests"
  ON public.support_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Admins can update support requests"
  ON public.support_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for support_request_messages
CREATE POLICY "Users can view messages on their support requests"
  ON public.support_request_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_requests
      WHERE id = support_request_id AND requester_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create messages on their support requests"
  ON public.support_request_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM public.support_requests
        WHERE id = support_request_id AND requester_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Create indexes for performance
CREATE INDEX idx_support_requests_requester ON public.support_requests(requester_id);
CREATE INDEX idx_support_requests_status ON public.support_requests(status);
CREATE INDEX idx_support_requests_assigned_to ON public.support_requests(assigned_to);
CREATE INDEX idx_support_request_messages_request ON public.support_request_messages(support_request_id);

-- Create updated_at trigger
CREATE TRIGGER update_support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();