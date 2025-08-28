-- Fix function search path security warnings by setting search_path to empty string
CREATE OR REPLACE FUNCTION public.get_database_stats()
RETURNS TABLE(
    table_name text,
    row_count bigint,
    table_size text,
    index_size text,
    total_size text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT 
        schemaname||'.'||relname as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_performance_metrics()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
    DELETE FROM public.performance_metrics 
    WHERE created_at < now() - interval '7 days';
$$;

-- Fix existing functions with search path security
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action_type text, _max_requests integer DEFAULT 10, _window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start time
  window_start := date_trunc('hour', now()) + 
    (EXTRACT(minute FROM now())::INTEGER / _window_minutes) * 
    (_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current count for this window
  SELECT COALESCE(request_count, 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = _user_id 
    AND action_type = _action_type 
    AND window_start = window_start;
  
  -- Check if limit exceeded
  IF current_count >= _max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO public.rate_limits (user_id, action_type, request_count, window_start)
  VALUES (_user_id, _action_type, current_count + 1, window_start)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(_event_type text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    table_name,
    action_type,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    'security_events',
    _event_type,
    _details,
    now()
  );
END;
$$;