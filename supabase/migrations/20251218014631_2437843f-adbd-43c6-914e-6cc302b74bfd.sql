
-- Drop and recreate v_pipeline_metrics with all funnel columns
DROP VIEW IF EXISTS v_pipeline_metrics;

CREATE VIEW v_pipeline_metrics AS
WITH date_ranges AS (
  SELECT 
    now() AS now,
    now() - interval '30 days' AS last_30_days,
    now() - interval '24 hours' AS last_24_hours,
    date_trunc('month', now()) AS month_start
),
application_metrics AS (
  SELECT
    count(*) FILTER (WHERE created_at >= (SELECT last_30_days FROM date_ranges)) AS applications_submitted_30d,
    count(*) FILTER (WHERE application_status = 'approved' AND reviewed_at >= (SELECT last_30_days FROM date_ranges)) AS applications_approved_30d,
    count(*) FILTER (WHERE application_status = 'pending') AS applications_pending,
    count(*) FILTER (WHERE application_status = 'rejected' AND reviewed_at >= (SELECT last_30_days FROM date_ranges)) AS applications_rejected_30d,
    avg(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600) FILTER (WHERE application_status = 'approved' AND reviewed_at >= (SELECT last_30_days FROM date_ranges)) AS avg_approval_hours_30d,
    -- Funnel columns
    count(*) FILTER (WHERE application_status IN ('pending', 'approved', 'rejected')) AS funnel_dispensary_applied,
    count(*) FILTER (WHERE application_status = 'approved') AS funnel_dispensary_approved,
    count(*) FILTER (WHERE application_status = 'approved' AND registration_completed = true) AS funnel_dispensary_registered
  FROM dispensary_applications
),
seat_metrics AS (
  SELECT
    count(*) AS total_seats,
    count(*) FILTER (WHERE status IN ('assigned', 'used')) AS assigned_seats,
    count(*) FILTER (WHERE status = 'available') AS available_seats,
    count(*) FILTER (WHERE status = 'used') AS used_seats,
    count(DISTINCT organization_id) FILTER (WHERE status = 'available') AS orgs_with_unused_seats,
    count(DISTINCT organization_id) AS funnel_dispensary_seats_purchased
  FROM rvt_seats
),
certificate_metrics AS (
  SELECT
    count(*) FILTER (WHERE created_at >= (SELECT last_30_days FROM date_ranges)) AS certificates_issued_30d,
    count(*) FILTER (WHERE expiry_date < (SELECT now FROM date_ranges)) AS certificates_expired,
    count(*) FILTER (WHERE expiry_date >= (SELECT now FROM date_ranges) AND expiry_date <= (SELECT now FROM date_ranges) + interval '30 days') AS certificates_expiring_soon,
    count(*) AS total_certificates
  FROM certificates
  WHERE is_revoked = false
),
user_metrics AS (
  SELECT
    count(*) FILTER (WHERE created_at >= (SELECT last_30_days FROM date_ranges)) AS users_registered_30d
  FROM profiles
),
employee_funnel AS (
  SELECT
    count(*) AS funnel_employee_invited
  FROM staff_invitations
),
employee_registered AS (
  SELECT
    count(DISTINCT p.user_id) AS funnel_employee_registered,
    count(DISTINCT p.user_id) FILTER (WHERE EXISTS (
      SELECT 1 FROM user_progress up WHERE up.user_id = p.user_id
    )) AS funnel_employee_started,
    count(DISTINCT p.user_id) FILTER (WHERE EXISTS (
      SELECT 1 FROM user_progress up WHERE up.user_id = p.user_id AND up.is_completed = true
    )) AS funnel_employee_with_progress
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'student'
  WHERE p.organization_id IS NOT NULL
),
course_completion AS (
  SELECT
    count(DISTINCT user_id) AS funnel_employee_completed
  FROM (
    SELECT up.user_id
    FROM user_progress up
    JOIN course_modules cm ON cm.id = up.module_id
    WHERE up.is_completed = true
    GROUP BY up.user_id, cm.course_id
    HAVING count(*) >= (SELECT count(*) FROM course_modules WHERE course_id = cm.course_id AND is_active = true)
  ) completed_users
),
exam_metrics AS (
  SELECT
    count(*) FILTER (WHERE completed_at >= (SELECT last_30_days FROM date_ranges)) AS exams_taken_30d,
    count(*) FILTER (WHERE is_passed = true AND completed_at >= (SELECT last_30_days FROM date_ranges)) AS exams_passed_30d,
    avg(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at >= (SELECT last_30_days FROM date_ranges)) AS avg_completion_days_30d,
    count(DISTINCT user_id) AS funnel_employee_took_exam,
    count(DISTINCT user_id) FILTER (WHERE is_passed = true) AS funnel_cert_passed
  FROM exam_attempts
),
cert_funnel AS (
  SELECT
    count(*) AS funnel_cert_generated,
    count(*) AS funnel_cert_delivered
  FROM certificates
  WHERE is_revoked = false
)
SELECT
  -- Application metrics
  COALESCE(am.applications_submitted_30d, 0) AS applications_submitted_30d,
  COALESCE(am.applications_approved_30d, 0) AS applications_approved_30d,
  COALESCE(am.applications_pending, 0) AS applications_pending,
  COALESCE(am.applications_rejected_30d, 0) AS applications_rejected_30d,
  COALESCE(am.avg_approval_hours_30d, 0) AS avg_approval_hours_30d,
  CASE 
    WHEN COALESCE(am.applications_submitted_30d, 0) > 0 
    THEN round((COALESCE(am.applications_approved_30d, 0)::numeric / am.applications_submitted_30d::numeric) * 100, 1)
    ELSE 0
  END AS approval_rate_30d,
  
  -- Seat metrics
  COALESCE(sm.total_seats, 0) AS total_seats,
  COALESCE(sm.assigned_seats, 0) AS assigned_seats,
  COALESCE(sm.available_seats, 0) AS available_seats,
  COALESCE(sm.used_seats, 0) AS used_seats,
  COALESCE(sm.orgs_with_unused_seats, 0) AS orgs_with_unused_seats,
  CASE 
    WHEN COALESCE(sm.total_seats, 0) > 0 
    THEN round((COALESCE(sm.assigned_seats, 0)::numeric / sm.total_seats::numeric) * 100, 1)
    ELSE 0
  END AS seat_utilization_rate,
  
  -- Certificate metrics
  COALESCE(cm.certificates_issued_30d, 0) AS certificates_issued_30d,
  COALESCE(cm.certificates_expired, 0) AS certificates_expired,
  COALESCE(cm.certificates_expiring_soon, 0) AS certificates_expiring_soon,
  
  -- User metrics
  COALESCE(um.users_registered_30d, 0) AS users_registered_30d,
  
  -- Certification conversion rate
  CASE 
    WHEN COALESCE(um.users_registered_30d, 0) > 0 
    THEN round((COALESCE(cm.certificates_issued_30d, 0)::numeric / um.users_registered_30d::numeric) * 100, 1)
    ELSE 0
  END AS certification_conversion_rate_30d,
  
  -- Exam metrics
  COALESCE(em.exams_taken_30d, 0) AS exams_taken_30d,
  COALESCE(em.exams_passed_30d, 0) AS exams_passed_30d,
  COALESCE(em.avg_completion_days_30d, 0) AS avg_completion_days_30d,
  CASE 
    WHEN COALESCE(em.exams_taken_30d, 0) > 0 
    THEN round((COALESCE(em.exams_passed_30d, 0)::numeric / em.exams_taken_30d::numeric) * 100, 1)
    ELSE 0
  END AS exam_pass_rate_30d,
  
  -- Dispensary Funnel
  COALESCE(am.funnel_dispensary_applied, 0) AS funnel_dispensary_applied,
  COALESCE(am.funnel_dispensary_approved, 0) AS funnel_dispensary_approved,
  COALESCE(am.funnel_dispensary_registered, 0) AS funnel_dispensary_registered,
  COALESCE(sm.funnel_dispensary_seats_purchased, 0) AS funnel_dispensary_seats_purchased,
  
  -- Employee Funnel
  COALESCE(ef.funnel_employee_invited, 0) AS funnel_employee_invited,
  COALESCE(er.funnel_employee_registered, 0) AS funnel_employee_registered,
  COALESCE(er.funnel_employee_started, 0) AS funnel_employee_started,
  COALESCE(cc.funnel_employee_completed, 0) AS funnel_employee_completed,
  COALESCE(em.funnel_employee_took_exam, 0) AS funnel_employee_took_exam,
  
  -- Certification Funnel
  COALESCE(em.funnel_employee_took_exam, 0) AS funnel_cert_took_exam,
  COALESCE(em.funnel_cert_passed, 0) AS funnel_cert_passed,
  COALESCE(cf.funnel_cert_generated, 0) AS funnel_cert_generated,
  COALESCE(cf.funnel_cert_delivered, 0) AS funnel_cert_delivered,
  
  -- Timestamp
  now() AS calculated_at
FROM application_metrics am
CROSS JOIN seat_metrics sm
CROSS JOIN certificate_metrics cm
CROSS JOIN user_metrics um
CROSS JOIN employee_funnel ef
CROSS JOIN employee_registered er
CROSS JOIN course_completion cc
CROSS JOIN exam_metrics em
CROSS JOIN cert_funnel cf;

-- Grant access to authenticated users (admins check done in RLS)
GRANT SELECT ON v_pipeline_metrics TO authenticated;
