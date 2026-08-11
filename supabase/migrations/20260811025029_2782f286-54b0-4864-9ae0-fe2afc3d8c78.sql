-- 2026-08-11: exec_readonly_sql rejected 100% of queries.
-- In PostgreSQL ARE regex \b == backspace (ASCII 8), NOT a word boundary (\y).
-- Applied directly via Supabase; mirrored here so the repo matches production.
CREATE OR REPLACE FUNCTION public.exec_readonly_sql(p_sql text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_sql !~* '^\s*(select|with)\y' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  IF p_sql ~* '\y(insert|update|delete|drop|alter|truncate|create|grant|revoke|comment|copy|vacuum|analyze|reindex|cluster|call|merge|refresh)\y' THEN
    RAISE EXCEPTION 'Forbidden keyword in SQL';
  END IF;
  EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', p_sql) INTO result;
  RETURN result;
END;
$function$;