-- ================================================================
-- VERIFICATION SCRIPT: Gap #2 & Gap #4 Prerequisites
-- Run this BEFORE executing the fix functions
-- ================================================================

-- 1. Check for expired registration tokens (Gap #2)
SELECT 
  id,
  organization_name,
  contact_email,
  application_status,
  registration_token_expires_at,
  EXTRACT(DAY FROM (NOW() - registration_token_expires_at))::INTEGER as days_expired,
  registration_completed
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = false
  AND registration_token_expires_at < NOW()
ORDER BY registration_token_expires_at ASC;

-- Expected: 7 expired applications

-- 2. Check for seat mismatches (Gap #4)
SELECT 
  o.id,
  o.name,
  o.course_credits,
  COUNT(rs.id) as actual_seats,
  (o.course_credits - COUNT(rs.id)) as deficit
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.course_credits > 0
GROUP BY o.id, o.name, o.course_credits
HAVING o.course_credits > COUNT(rs.id)
ORDER BY deficit DESC;

-- Expected: Demo Dispensary LLC with 50 credits, 0 seats, 50 deficit

-- 3. Verify active courses exist
SELECT id, title, course_type, target_audience, is_active
FROM courses
WHERE is_active = true;

-- Expected: At least 1 active course

-- 4. Check notification queue is functional
SELECT 
  status,
  COUNT(*) as count
FROM notification_queue
GROUP BY status;

-- Expected: System can queue notifications

-- 5. Verify admin user making the request
SELECT 
  u.id,
  u.email,
  r.role
FROM auth.users u
JOIN user_roles r ON r.user_id = u.id
WHERE r.role = 'admin'
  AND u.id = auth.uid();

-- Expected: Your admin user appears here
