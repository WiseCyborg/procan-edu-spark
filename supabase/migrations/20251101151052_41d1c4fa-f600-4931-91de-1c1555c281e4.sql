-- Fix ambiguous column reference bug in check_rate_limit function
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
  _window_start TIMESTAMP WITH TIME ZONE;
  current_count INTEGER;
BEGIN
  -- Calculate window start time
  _window_start := date_trunc('minute', now()) - (EXTRACT(MINUTE FROM now())::INTEGER % _window_minutes || ' minutes')::INTERVAL;
  
  -- Insert or update rate limit record
  INSERT INTO public.rate_limits (user_id, action_type, request_count, window_start, window_minutes)
  VALUES (_user_id, _action_type, 1, _window_start, _window_minutes)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    window_minutes = _window_minutes;
  
  -- Get current count
  SELECT request_count INTO current_count
  FROM public.rate_limits
  WHERE user_id = _user_id 
    AND action_type = _action_type 
    AND window_start = _window_start;
  
  -- Return true if under limit
  RETURN current_count <= _max_requests;
END;
$$;