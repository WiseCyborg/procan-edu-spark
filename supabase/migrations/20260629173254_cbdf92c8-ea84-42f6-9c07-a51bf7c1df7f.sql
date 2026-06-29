CREATE OR REPLACE FUNCTION public.exec_readonly_sql(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_sql !~* '^\s*(select|with)\b' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  IF p_sql ~* '\y(insert|update|delete|drop|alter|truncate|create|grant|revoke|comment|copy|vacuum|analyze|reindex|cluster|call|merge|refresh)\y' THEN
    RAISE EXCEPTION 'Forbidden keyword in SQL';
  END IF;

  EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', p_sql) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_readonly_sql(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_readonly_sql(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_readonly_sql(text) TO service_role;