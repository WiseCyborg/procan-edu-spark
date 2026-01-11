-- Production Readiness Phase 1: Payment Events & Module State Machine

-- 1. Payment events table for webhook-based entitlements
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  session_id text,
  user_id uuid REFERENCES auth.users(id),
  order_id uuid REFERENCES public.orders(id),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed')),
  payload jsonb DEFAULT '{}',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can manage payment events
CREATE POLICY "Admins can view payment events"
  ON public.payment_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Module state log for audit trail
CREATE TABLE public.module_state_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  course_id uuid NOT NULL REFERENCES public.courses(id),
  module_id uuid NOT NULL REFERENCES public.course_modules(id),
  from_state text,
  to_state text NOT NULL,
  trigger_event text NOT NULL, -- 'started', 'quiz_passed', 'quiz_failed', 'video_complete', 'manual_reset'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_state_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own state logs
CREATE POLICY "Users can view own module state logs"
  ON public.module_state_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all module state logs"
  ON public.module_state_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Certificate audit log (immutable - no UPDATE/DELETE)
CREATE TABLE public.certificate_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.certificates(id),
  action text NOT NULL CHECK (action IN ('issued', 'verified', 'downloaded', 'revoked', 'expired')),
  actor_id uuid REFERENCES auth.users(id),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view certificate audit logs"
  ON public.certificate_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can view their own certificate audits
CREATE POLICY "Users can view own certificate audits"
  ON public.certificate_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.certificates c 
      WHERE c.id = certificate_id AND c.user_id = auth.uid()
    )
  );

-- 4. Alert rules table for monitoring
CREATE TABLE public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  threshold_value numeric NOT NULL,
  comparison_operator text NOT NULL CHECK (comparison_operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  notification_channel text NOT NULL CHECK (notification_channel IN ('email', 'dashboard', 'slack')),
  recipient_emails text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  cooldown_minutes integer DEFAULT 60,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Only admins can manage alert rules
CREATE POLICY "Admins can manage alert rules"
  ON public.alert_rules
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Create module progress state machine function
CREATE OR REPLACE FUNCTION public.update_module_progress_state(
  p_user_id uuid,
  p_course_id uuid,
  p_module_id uuid,
  p_new_state text,
  p_trigger_event text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_state text;
  v_allowed_transitions jsonb;
  v_is_allowed boolean;
  v_next_step jsonb;
BEGIN
  -- Define allowed state transitions
  v_allowed_transitions := '{
    "not_started": ["in_progress"],
    "in_progress": ["quiz_attempted", "completed"],
    "quiz_attempted": ["completed", "in_progress"],
    "completed": []
  }'::jsonb;

  -- Get current state from course_progress
  SELECT 
    CASE 
      WHEN cp.completed_modules @> jsonb_build_array(p_module_id::text) THEN 'completed'
      WHEN cp.current_module_id = p_module_id THEN 'in_progress'
      ELSE 'not_started'
    END INTO v_current_state
  FROM public.course_progress cp
  WHERE cp.user_id = p_user_id AND cp.course_id = p_course_id;

  -- Default to not_started if no record
  v_current_state := COALESCE(v_current_state, 'not_started');

  -- Check if transition is allowed
  v_is_allowed := v_allowed_transitions->v_current_state ? p_new_state;

  IF NOT v_is_allowed AND v_current_state != p_new_state THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid state transition from %s to %s', v_current_state, p_new_state),
      'current_state', v_current_state
    );
  END IF;

  -- Log the state transition
  INSERT INTO public.module_state_log (
    user_id, course_id, module_id, from_state, to_state, trigger_event, metadata
  ) VALUES (
    p_user_id, p_course_id, p_module_id, v_current_state, p_new_state, p_trigger_event, p_metadata
  );

  -- Update course_progress based on new state
  IF p_new_state = 'completed' THEN
    UPDATE public.course_progress
    SET 
      completed_modules = completed_modules || jsonb_build_array(p_module_id::text),
      updated_at = now()
    WHERE user_id = p_user_id AND course_id = p_course_id
    AND NOT (completed_modules @> jsonb_build_array(p_module_id::text));
  ELSIF p_new_state = 'in_progress' THEN
    UPDATE public.course_progress
    SET 
      current_module_id = p_module_id,
      updated_at = now()
    WHERE user_id = p_user_id AND course_id = p_course_id;
  END IF;

  -- Compute next step
  SELECT jsonb_build_object(
    'next_module_id', (
      SELECT cm.id FROM public.course_modules cm
      WHERE cm.course_id = p_course_id
      AND cm.module_number > (SELECT module_number FROM public.course_modules WHERE id = p_module_id)
      ORDER BY cm.module_number ASC
      LIMIT 1
    ),
    'course_completed', (
      SELECT COUNT(*) = (SELECT COUNT(*) FROM public.course_modules WHERE course_id = p_course_id AND is_active = true)
      FROM jsonb_array_elements_text(
        (SELECT completed_modules FROM public.course_progress WHERE user_id = p_user_id AND course_id = p_course_id)
      )
    )
  ) INTO v_next_step;

  RETURN jsonb_build_object(
    'success', true,
    'previous_state', v_current_state,
    'new_state', p_new_state,
    'next_step', v_next_step
  );
END;
$$;

-- 6. Create payment reconciliation function
CREATE OR REPLACE FUNCTION public.reconcile_payment_status(p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_payment_event record;
BEGIN
  -- Find order by session ID
  SELECT * INTO v_order
  FROM public.orders
  WHERE stripe_session_id = p_session_id;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Check for completed payment event
  SELECT * INTO v_payment_event
  FROM public.payment_events
  WHERE session_id = p_session_id
  AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_payment_event IS NULL AND v_order.status = 'paid' THEN
    -- Order is paid but no webhook confirmation - flag for review
    RETURN jsonb_build_object(
      'success', false,
      'warning', 'Order marked paid without webhook confirmation',
      'order_id', v_order.id,
      'needs_review', true
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_status', v_order.status,
    'webhook_confirmed', v_payment_event IS NOT NULL
  );
END;
$$;

-- Add indexes for performance
CREATE INDEX idx_payment_events_session ON public.payment_events(session_id);
CREATE INDEX idx_payment_events_stripe_event ON public.payment_events(stripe_event_id);
CREATE INDEX idx_payment_events_status ON public.payment_events(status);
CREATE INDEX idx_module_state_log_user_course ON public.module_state_log(user_id, course_id);
CREATE INDEX idx_certificate_audit_cert ON public.certificate_audit_log(certificate_id);
CREATE INDEX idx_alert_rules_active ON public.alert_rules(is_active) WHERE is_active = true;