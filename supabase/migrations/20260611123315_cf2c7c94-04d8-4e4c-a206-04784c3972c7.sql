
-- Registry of every row inserted by the UAT seed tool, so we can purge cleanly.
CREATE TABLE IF NOT EXISTS public.uat_seed_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL,
  entity_id text NOT NULL,
  seed_batch text NOT NULL DEFAULT to_char(now(), 'YYYYMMDD-HH24MISS'),
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

GRANT SELECT ON public.uat_seed_entities TO authenticated;
GRANT ALL ON public.uat_seed_entities TO service_role;

ALTER TABLE public.uat_seed_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view uat_seed_entities"
ON public.uat_seed_entities FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_uat_seed_entities_batch ON public.uat_seed_entities (seed_batch);

-- Vault installer (admin-only, called via edge function with caller-validated admin)
CREATE OR REPLACE FUNCTION public.install_regression_vault_secret(_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_existing uuid;
BEGIN
  IF _value IS NULL OR length(_value) < 20 THEN
    RAISE EXCEPTION 'invalid_secret_value';
  END IF;

  SELECT id INTO v_existing FROM vault.secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(_value, 'service_role_key', 'Used by post-migration-regression cron');
    RETURN 'created';
  ELSE
    PERFORM vault.update_secret(v_existing, _value);
    RETURN 'updated';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.install_regression_vault_secret(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.install_regression_vault_secret(text) TO service_role;

-- Purge helper: deletes every registered uat-seed row, then clears the registry.
CREATE OR REPLACE FUNCTION public.purge_uat_seed_entities(_batch text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  r record;
  v_deleted int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_sql text;
BEGIN
  -- Reverse insertion order so children go first
  FOR r IN
    SELECT id, entity_table, entity_id
    FROM public.uat_seed_entities
    WHERE _batch IS NULL OR seed_batch = _batch
    ORDER BY created_at DESC
  LOOP
    BEGIN
      IF r.entity_table = 'auth.users' THEN
        DELETE FROM auth.users WHERE id = r.entity_id::uuid;
      ELSE
        v_sql := format('DELETE FROM %s WHERE id = $1', r.entity_table);
        EXECUTE v_sql USING r.entity_id;
      END IF;
      DELETE FROM public.uat_seed_entities WHERE id = r.id;
      v_deleted := v_deleted + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('table', r.entity_table, 'id', r.entity_id, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('deleted', v_deleted, 'errors', v_errors);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_uat_seed_entities(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_uat_seed_entities(text) TO service_role;
