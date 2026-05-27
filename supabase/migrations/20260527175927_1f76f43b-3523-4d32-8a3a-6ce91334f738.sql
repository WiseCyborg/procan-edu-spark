
-- Regression automation: table, bucket, cron watcher

CREATE TABLE public.regression_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_version TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'auto',
  status TEXT NOT NULL DEFAULT 'running',
  run1_summary JSONB,
  run2_summary JSONB,
  deterministic BOOLEAN,
  verdict TEXT,
  report_path TEXT,
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_regression_runs_created ON public.regression_runs (created_at DESC);
CREATE INDEX idx_regression_runs_version ON public.regression_runs (migration_version);

GRANT SELECT ON public.regression_runs TO authenticated;
GRANT ALL ON public.regression_runs TO service_role;

ALTER TABLE public.regression_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view regression runs"
ON public.regression_runs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages regression runs"
ON public.regression_runs FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Settings table (single-row kill switch)
CREATE TABLE public.regression_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  auto_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO public.regression_settings (id, auto_enabled) VALUES (1, true);

GRANT SELECT ON public.regression_settings TO authenticated;
GRANT ALL ON public.regression_settings TO service_role;
ALTER TABLE public.regression_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read regression settings" ON public.regression_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update regression settings" ON public.regression_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service role all settings" ON public.regression_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('regression-reports', 'regression-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read regression reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'regression-reports' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Service role manages regression reports"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'regression-reports') WITH CHECK (bucket_id = 'regression-reports');

-- Watcher function: detects new migrations and triggers edge function
CREATE OR REPLACE FUNCTION public.enqueue_regression_if_new()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_latest_migration TEXT;
  v_last_processed TEXT;
  v_running_count INTEGER;
  v_srk TEXT;
  v_url TEXT := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/post-migration-regression';
BEGIN
  SELECT auto_enabled INTO v_enabled FROM public.regression_settings WHERE id = 1;
  IF NOT COALESCE(v_enabled, false) THEN RETURN; END IF;

  -- Concurrency guard
  SELECT COUNT(*) INTO v_running_count FROM public.regression_runs WHERE status = 'running' AND created_at > now() - interval '15 minutes';
  IF v_running_count > 0 THEN RETURN; END IF;

  -- Latest migration version
  SELECT MAX(version) INTO v_latest_migration FROM supabase_migrations.schema_migrations;
  IF v_latest_migration IS NULL THEN RETURN; END IF;

  -- Last processed
  SELECT migration_version INTO v_last_processed FROM public.regression_runs ORDER BY created_at DESC LIMIT 1;

  IF v_last_processed IS NOT DISTINCT FROM v_latest_migration THEN RETURN; END IF;

  -- Read service role key from vault
  SELECT decrypted_secret INTO v_srk FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_srk IS NULL THEN
    RAISE NOTICE 'service_role_key not found in vault; skipping regression enqueue';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_srk
    ),
    body := jsonb_build_object(
      'migration_version', v_latest_migration,
      'triggered_by', 'auto'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_regression_if_new() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_regression_if_new() TO service_role;

-- Cron: every minute
SELECT cron.schedule('regression-watcher', '* * * * *', $$SELECT public.enqueue_regression_if_new();$$);

-- Updated_at trigger
CREATE TRIGGER trg_regression_runs_updated
BEFORE UPDATE ON public.regression_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
