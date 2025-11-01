-- Create function to clear rate limits for a user
CREATE OR REPLACE FUNCTION clear_user_rate_limits(
  _user_id uuid DEFAULT NULL,
  _action_type text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Only admins can clear rate limits
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can clear rate limits';
  END IF;

  -- Delete matching rate limit entries
  DELETE FROM rate_limits
  WHERE (_user_id IS NULL OR user_id = _user_id)
    AND (_action_type IS NULL OR action_type = _action_type);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create function to view active rate limits with time remaining
CREATE OR REPLACE FUNCTION get_active_rate_limits()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  action_type text,
  request_count integer,
  window_start timestamptz,
  window_minutes integer,
  time_remaining_minutes integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can view rate limits
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view rate limits';
  END IF;

  RETURN QUERY
  SELECT 
    rl.id,
    rl.user_id,
    COALESCE(p.email, au.email) as user_email,
    rl.action_type,
    rl.request_count,
    rl.window_start,
    rl.window_minutes,
    GREATEST(0, EXTRACT(EPOCH FROM (rl.window_start + (rl.window_minutes || ' minutes')::interval - now()))::integer / 60) as time_remaining_minutes,
    rl.created_at
  FROM rate_limits rl
  LEFT JOIN profiles p ON p.user_id = rl.user_id
  LEFT JOIN auth.users au ON au.id = rl.user_id
  WHERE rl.window_start + (rl.window_minutes || ' minutes')::interval > now()
  ORDER BY rl.created_at DESC;
END;
$$;