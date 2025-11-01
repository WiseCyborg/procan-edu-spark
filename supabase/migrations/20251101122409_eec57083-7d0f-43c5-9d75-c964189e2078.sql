-- Add missing window_minutes column to rate_limits table
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS window_minutes INTEGER NOT NULL DEFAULT 10;

-- Drop and recreate check_rate_limit to store window_minutes
DROP FUNCTION IF EXISTS check_rate_limit(UUID, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION check_rate_limit(
  _user_id UUID,
  _action_type TEXT,
  _max_requests INTEGER DEFAULT 5,
  _window_minutes INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_start TIMESTAMP WITH TIME ZONE;
  current_count INTEGER;
BEGIN
  -- Calculate window start time
  window_start := date_trunc('minute', now()) - (EXTRACT(MINUTE FROM now())::INTEGER % _window_minutes || ' minutes')::INTERVAL;
  
  -- Insert or update rate limit record
  INSERT INTO public.rate_limits (user_id, action_type, request_count, window_start, window_minutes)
  VALUES (_user_id, _action_type, 1, window_start, _window_minutes)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    window_minutes = _window_minutes;
  
  -- Get current count
  SELECT request_count INTO current_count
  FROM public.rate_limits
  WHERE user_id = _user_id 
    AND action_type = _action_type 
    AND window_start = window_start;
  
  -- Return true if under limit
  RETURN current_count <= _max_requests;
END;
$$;

-- Drop and recreate get_active_rate_limits with fixed column references
DROP FUNCTION IF EXISTS get_active_rate_limits();

CREATE OR REPLACE FUNCTION get_active_rate_limits()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  action_type TEXT,
  request_count INTEGER,
  window_start TIMESTAMP WITH TIME ZONE,
  window_minutes INTEGER,
  time_remaining_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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