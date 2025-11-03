-- ============================================================================
-- DAY 1-2: Core Job Queue Infrastructure
-- ============================================================================

-- Job queue table
CREATE TABLE IF NOT EXISTS public.system_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  idempotency_key text UNIQUE,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' 
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 5,
  last_error text,
  
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  next_retry_at timestamptz,
  
  created_by uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES public.organizations(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_jobs_queued ON system_jobs(queued_at) WHERE status = 'queued';
CREATE INDEX idx_jobs_retry ON system_jobs(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX idx_jobs_type_status ON system_jobs(job_type, status);
CREATE INDEX idx_jobs_idempotency ON system_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Dead letter queue
CREATE TABLE IF NOT EXISTS public.system_jobs_deadletter (
  id uuid PRIMARY KEY,
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  failure_reason text NOT NULL,
  retry_count int NOT NULL,
  last_error text,
  original_queued_at timestamptz NOT NULL,
  moved_to_dlq_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Queue a job (idempotent)
CREATE OR REPLACE FUNCTION queue_job(
  p_job_type text,
  p_payload jsonb,
  p_idempotency_key text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL,
  p_max_retries int DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
  v_existing_job_id uuid;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_job_id
    FROM system_jobs
    WHERE idempotency_key = p_idempotency_key
      AND status IN ('queued', 'processing', 'completed');
    
    IF v_existing_job_id IS NOT NULL THEN
      RAISE NOTICE 'Job already exists with idempotency_key: %', p_idempotency_key;
      RETURN v_existing_job_id;
    END IF;
  END IF;
  
  -- Insert new job
  INSERT INTO system_jobs (
    job_type,
    idempotency_key,
    payload,
    organization_id,
    max_retries,
    created_by
  ) VALUES (
    p_job_type,
    p_idempotency_key,
    p_payload,
    p_organization_id,
    p_max_retries,
    auth.uid()
  )
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;

-- Move failed job to dead letter queue
CREATE OR REPLACE FUNCTION move_to_deadletter(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
BEGIN
  SELECT * INTO v_job FROM system_jobs WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;
  
  INSERT INTO system_jobs_deadletter (
    id, job_type, payload, failure_reason, retry_count, 
    last_error, original_queued_at, metadata
  ) VALUES (
    v_job.id, v_job.job_type, v_job.payload, 
    'Max retries exceeded', v_job.retry_count, 
    v_job.last_error, v_job.queued_at, v_job.metadata
  );
  
  DELETE FROM system_jobs WHERE id = p_job_id;
  
  -- Alert admin
  PERFORM queue_job(
    'admin_alert',
    jsonb_build_object(
      'alert_type', 'job_deadlettered',
      'job_id', p_job_id,
      'job_type', v_job.job_type,
      'error', v_job.last_error
    )
  );
END;
$$;

-- RLS policies
ALTER TABLE system_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_jobs_deadletter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all jobs"
  ON system_jobs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view deadletter"
  ON system_jobs_deadletter FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- DAY 3: Idempotency for Critical Paths
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  api_route text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  request_params jsonb,
  response_data jsonb,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX idx_api_requests_key_time ON api_requests(idempotency_key, created_at);
CREATE INDEX idx_api_requests_route ON api_requests(api_route);

-- Auto-cleanup old requests (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM api_requests WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- ============================================================================
-- DAY 5: Feature Flags & Email Circuit Breaker
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL UNIQUE,
  flag_value boolean NOT NULL DEFAULT false,
  scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'organization', 'user')),
  scope_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT unique_scoped_flag UNIQUE (flag_key, scope, scope_id)
);

CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX idx_feature_flags_scope ON feature_flags(flag_key, scope, scope_id);

-- Helper function to check feature flag
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_flag_key text,
  p_organization_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  -- Check user-specific flag first
  IF p_user_id IS NOT NULL THEN
    SELECT flag_value INTO v_enabled
    FROM feature_flags
    WHERE flag_key = p_flag_key
      AND scope = 'user'
      AND scope_id = p_user_id;
    
    IF FOUND THEN
      RETURN v_enabled;
    END IF;
  END IF;
  
  -- Check organization-specific flag
  IF p_organization_id IS NOT NULL THEN
    SELECT flag_value INTO v_enabled
    FROM feature_flags
    WHERE flag_key = p_flag_key
      AND scope = 'organization'
      AND scope_id = p_organization_id;
    
    IF FOUND THEN
      RETURN v_enabled;
    END IF;
  END IF;
  
  -- Check global flag
  SELECT flag_value INTO v_enabled
  FROM feature_flags
  WHERE flag_key = p_flag_key
    AND scope = 'global';
  
  IF FOUND THEN
    RETURN v_enabled;
  END IF;
  
  -- Default to false if flag doesn't exist
  RETURN false;
END;
$$;

-- Insert default flags
INSERT INTO feature_flags (flag_key, flag_value, scope, description) VALUES
('email_circuit_breaker_enabled', true, 'global', 'Enable email circuit breaker pattern'),
('email_fallback_smtp_enabled', false, 'global', 'Enable SMTP fallback when Resend fails'),
('exam_camera_required', true, 'global', 'Require photo verification for final exam'),
('paypal_sandbox_mode', false, 'global', 'Use PayPal sandbox environment')
ON CONFLICT (flag_key) DO NOTHING;

-- Email circuit breaker
CREATE TABLE IF NOT EXISTS public.email_circuit_breaker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_state text NOT NULL DEFAULT 'closed' CHECK (circuit_state IN ('closed', 'open', 'half_open')),
  failure_count int NOT NULL DEFAULT 0,
  last_failure_at timestamptz,
  opened_at timestamptz,
  half_open_at timestamptz,
  closed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert single row for circuit breaker state
INSERT INTO email_circuit_breaker (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Function to check and update circuit breaker
CREATE OR REPLACE FUNCTION check_email_circuit()
RETURNS TABLE(
  is_open boolean,
  state text,
  failure_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circuit record;
  v_threshold int := 3;
  v_timeout_minutes int := 10;
BEGIN
  SELECT * INTO v_circuit FROM email_circuit_breaker LIMIT 1;
  
  -- If circuit is open, check if timeout has passed
  IF v_circuit.circuit_state = 'open' THEN
    IF v_circuit.opened_at < NOW() - INTERVAL '1 minute' * v_timeout_minutes THEN
      -- Move to half_open state
      UPDATE email_circuit_breaker
      SET circuit_state = 'half_open',
          half_open_at = NOW(),
          updated_at = NOW();
      
      RETURN QUERY SELECT false, 'half_open'::text, v_circuit.failure_count;
      RETURN;
    ELSE
      RETURN QUERY SELECT true, 'open'::text, v_circuit.failure_count;
      RETURN;
    END IF;
  END IF;
  
  -- Circuit is closed or half_open
  RETURN QUERY SELECT false, v_circuit.circuit_state, v_circuit.failure_count;
END;
$$;

-- Function to record email success/failure
CREATE OR REPLACE FUNCTION record_email_result(p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circuit record;
  v_threshold int := 3;
BEGIN
  SELECT * INTO v_circuit FROM email_circuit_breaker LIMIT 1;
  
  IF p_success THEN
    -- Success - reset circuit if in half_open, or just clear failure count
    UPDATE email_circuit_breaker
    SET circuit_state = 'closed',
        failure_count = 0,
        closed_at = CASE WHEN circuit_state = 'half_open' THEN NOW() ELSE closed_at END,
        updated_at = NOW();
  ELSE
    -- Failure - increment count and potentially open circuit
    UPDATE email_circuit_breaker
    SET failure_count = failure_count + 1,
        last_failure_at = NOW(),
        circuit_state = CASE 
          WHEN failure_count + 1 >= v_threshold THEN 'open'
          ELSE circuit_state
        END,
        opened_at = CASE 
          WHEN failure_count + 1 >= v_threshold THEN NOW()
          ELSE opened_at
        END,
        updated_at = NOW();
    
    -- Alert admin if circuit opened
    IF v_circuit.failure_count + 1 >= v_threshold THEN
      PERFORM queue_job(
        'admin_alert',
        jsonb_build_object(
          'alert_type', 'email_circuit_opened',
          'failure_count', v_circuit.failure_count + 1,
          'message', 'Email circuit breaker opened due to repeated failures'
        )
      );
    END IF;
  END IF;
END;
$$;

-- ============================================================================
-- DAY 6: SLO Dashboard & Monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.slo_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  target_value numeric NOT NULL,
  unit text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slo_metrics_name_time ON slo_metrics(metric_name, period_start DESC);

-- Function to calculate SLOs
CREATE OR REPLACE FUNCTION calculate_slo_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start timestamptz := NOW() - INTERVAL '1 hour';
  v_period_end timestamptz := NOW();
  v_email_acceptance_rate numeric;
  v_approval_latency_p95 numeric;
  v_registration_success_rate numeric;
BEGIN
  -- Email send acceptance rate
  SELECT 
    (COUNT(*) FILTER (WHERE delivery_status IN ('sent', 'delivered'))::numeric / 
     NULLIF(COUNT(*), 0) * 100)
  INTO v_email_acceptance_rate
  FROM communication_logs
  WHERE created_at BETWEEN v_period_start AND v_period_end
    AND communication_type = 'email';
  
  INSERT INTO slo_metrics (metric_name, metric_value, target_value, unit, period_start, period_end, status)
  VALUES (
    'email_acceptance_rate',
    COALESCE(v_email_acceptance_rate, 100),
    99,
    'percentage',
    v_period_start,
    v_period_end,
    CASE 
      WHEN COALESCE(v_email_acceptance_rate, 100) >= 99 THEN 'healthy'
      WHEN COALESCE(v_email_acceptance_rate, 100) >= 95 THEN 'warning'
      ELSE 'critical'
    END
  );
  
  -- Approval completion latency (P95)
  WITH approval_latencies AS (
    SELECT 
      EXTRACT(EPOCH FROM (completed_at - queued_at)) as latency_seconds
    FROM system_jobs
    WHERE job_type = 'send_approval_email'
      AND status = 'completed'
      AND queued_at BETWEEN v_period_start AND v_period_end
  )
  SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_seconds)
  INTO v_approval_latency_p95
  FROM approval_latencies;
  
  INSERT INTO slo_metrics (metric_name, metric_value, target_value, unit, period_start, period_end, status)
  VALUES (
    'approval_latency_p95',
    COALESCE(v_approval_latency_p95, 0),
    3,
    'seconds',
    v_period_start,
    v_period_end,
    CASE 
      WHEN COALESCE(v_approval_latency_p95, 0) <= 3 THEN 'healthy'
      WHEN COALESCE(v_approval_latency_p95, 0) <= 5 THEN 'warning'
      ELSE 'critical'
    END
  );
  
  -- Registration success rate
  SELECT 
    (COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
     NULLIF(COUNT(*), 0) * 100)
  INTO v_registration_success_rate
  FROM system_jobs
  WHERE job_type = 'send_welcome_email'
    AND queued_at BETWEEN v_period_start AND v_period_end;
  
  INSERT INTO slo_metrics (metric_name, metric_value, target_value, unit, period_start, period_end, status)
  VALUES (
    'registration_success_rate',
    COALESCE(v_registration_success_rate, 100),
    95,
    'percentage',
    v_period_start,
    v_period_end,
    CASE 
      WHEN COALESCE(v_registration_success_rate, 100) >= 95 THEN 'healthy'
      WHEN COALESCE(v_registration_success_rate, 100) >= 90 THEN 'warning'
      ELSE 'critical'
    END
  );
END;
$$;