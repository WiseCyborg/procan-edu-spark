-- Create helper function for seat mismatch detection
CREATE OR REPLACE FUNCTION public.check_seat_mismatches()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  course_credits INTEGER,
  seat_count BIGINT,
  deficit INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.course_credits,
    COUNT(rs.id) as seat_count,
    (o.course_credits - COUNT(rs.id))::INTEGER as deficit
  FROM organizations o
  LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
  WHERE o.course_credits > 0
  GROUP BY o.id, o.name, o.course_credits
  HAVING o.course_credits > COUNT(rs.id);
END;
$$;

-- Grant execute to authenticated users (admins will check via RLS)
GRANT EXECUTE ON FUNCTION public.check_seat_mismatches() TO authenticated;

COMMENT ON FUNCTION public.check_seat_mismatches() IS 'Returns organizations with more course credits than allocated seats';
