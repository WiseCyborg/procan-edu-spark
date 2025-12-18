-- Email Events: Single source of truth for all email activity
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID REFERENCES public.organizations(id),
  user_id UUID,
  recipient_email TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  template_version INTEGER,
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complaint', 'failed')),
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}'::jsonb
);

-- Email Health Snapshot: Current state of email system
CREATE TABLE IF NOT EXISTS public.email_health_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_rate_24h NUMERIC(5,2),
  bounce_rate_24h NUMERIC(5,2),
  complaint_rate_24h NUMERIC(5,4),
  failures_1h INTEGER DEFAULT 0,
  latency_avg_ms INTEGER DEFAULT 0,
  queue_depth INTEGER DEFAULT 0,
  circuit_state TEXT DEFAULT 'closed' CHECK (circuit_state IN ('closed', 'open', 'half_open')),
  circuit_reason TEXT,
  last_provider_error TEXT,
  emails_sent_24h INTEGER DEFAULT 0,
  emails_delivered_24h INTEGER DEFAULT 0,
  emails_opened_24h INTEGER DEFAULT 0,
  emails_clicked_24h INTEGER DEFAULT 0
);

-- Email Inbox Messages: Inbound replies for triage
CREATE TABLE IF NOT EXISTS public.email_inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  linked_message_id TEXT,
  linked_event_id UUID REFERENCES public.email_events(id),
  org_id UUID REFERENCES public.organizations(id),
  user_id UUID,
  classification TEXT CHECK (classification IN ('question', 'complaint', 'access_issue', 'billing', 'support', 'other', 'unclassified')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'responded', 'escalated', 'resolved')),
  ai_draft_response TEXT,
  assigned_to UUID,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  resolved_at TIMESTAMPTZ,
  meta JSONB DEFAULT '{}'::jsonb
);

-- Add contract_json to email_templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS contract_json JSONB DEFAULT '{"required_variables": [], "allowed_ai_fields": [], "tone": "professional", "locked_footer": true}'::jsonb;

ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS ai_personalization_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS allowed_tone TEXT DEFAULT 'professional' CHECK (allowed_tone IN ('professional', 'warm', 'urgent', 'neutral'));

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_health_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_inbox_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_events (admin read)
CREATE POLICY "Admin can read all email events"
ON public.email_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert email events"
ON public.email_events FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS for email_health_snapshot
CREATE POLICY "Admin can read health snapshots"
ON public.email_health_snapshot FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage health snapshots"
ON public.email_health_snapshot FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for email_inbox_messages
CREATE POLICY "Admin can manage inbox messages"
ON public.email_inbox_messages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_health_snapshot;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_inbox_messages;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON public.email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_org_id ON public.email_events(org_id);
CREATE INDEX IF NOT EXISTS idx_email_events_recipient ON public.email_events(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_inbox_status ON public.email_inbox_messages(status);

-- Insert initial health snapshot
INSERT INTO public.email_health_snapshot (circuit_state, delivery_rate_24h, bounce_rate_24h)
VALUES ('closed', 100.00, 0.00)
ON CONFLICT DO NOTHING;