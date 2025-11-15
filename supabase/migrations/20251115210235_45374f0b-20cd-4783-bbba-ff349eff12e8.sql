-- =====================================================
-- PIPELINE METRICS VIEW FOR COMPREHENSIVE MONITORING
-- Creates aggregated view for admin dashboard metrics
-- =====================================================

-- Drop view if exists
DROP VIEW IF EXISTS public.v_pipeline_metrics;

-- Create comprehensive pipeline metrics view
CREATE OR REPLACE VIEW public.v_pipeline_metrics AS
WITH date_ranges AS (
  SELECT
    NOW() AS now,
    NOW() - INTERVAL '30 days' AS last_30_days,
    NOW() - INTERVAL '24 hours' AS last_24_hours,
    DATE_TRUNC('month', NOW()) AS month_start
),
application_metrics AS (
  SELECT
    COUNT(*) FILTER (WHERE created_at >= (SELECT last_30_days FROM date_ranges)) AS applications_submitted_30d,
    COUNT(*) FILTER (WHERE application_status = 'approved' AND reviewed_at >= (SELECT last_30_days FROM date_ranges)) AS applications_approved_30d,
    COUNT(*) FILTER (WHERE application_status = 'pending') AS applications_pending,
    COUNT(*) FILTER (WHERE application_status = 'rejected' AND reviewed_at >= (SELECT last_30_days FROM date_ranges)) AS applications_rejected_30d,
    AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600) FILTER (WHERE application_status = 'approved' AND reviewed_at >= (SELECT last_30_days FROM date_ranges)) AS avg_approval_hours_30d
  FROM dispensary_applications
),
seat_metrics AS (
  SELECT
    COUNT(*) AS total_seats,
    COUNT(*) FILTER (WHERE status IN ('assigned', 'used')) AS assigned_seats,
    COUNT(*) FILTER (WHERE status = 'available') AS available_seats,
    COUNT(*) FILTER (WHERE status = 'used') AS used_seats,
    COUNT(DISTINCT organization_id) FILTER (WHERE status = 'available') AS orgs_with_unused_seats
  FROM rvt_seats
),
certificate_metrics AS (
  SELECT
    COUNT(*) FILTER (WHERE created_at >= (SELECT last_30_days FROM date_ranges)) AS certificates_issued_30d,
    COUNT(*) FILTER (WHERE expiry_date < (SELECT now FROM date_ranges)) AS certificates_expired,
    COUNT(*) FILTER (WHERE expiry_date BETWEEN (SELECT now FROM date_ranges) AND (SELECT now FROM date_ranges) + INTERVAL '30 days') AS certificates_expiring_soon
  FROM certificates
  WHERE is_revoked = false
),
user_metrics AS (
  SELECT
    COUNT(*) FILTER (WHERE created_at >= (SELECT last_30_days FROM date_ranges)) AS users_registered_30d
  FROM profiles
),
exam_metrics AS (
  SELECT
    COUNT(*) FILTER (WHERE completed_at >= (SELECT last_30_days FROM date_ranges)) AS exams_taken_30d,
    COUNT(*) FILTER (WHERE is_passed = true AND completed_at >= (SELECT last_30_days FROM date_ranges)) AS exams_passed_30d,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at >= (SELECT last_30_days FROM date_ranges)) AS avg_completion_days_30d
  FROM exam_attempts
)
SELECT
  -- Application funnel metrics
  COALESCE(am.applications_submitted_30d, 0) AS applications_submitted_30d,
  COALESCE(am.applications_approved_30d, 0) AS applications_approved_30d,
  COALESCE(am.applications_pending, 0) AS applications_pending,
  COALESCE(am.applications_rejected_30d, 0) AS applications_rejected_30d,
  COALESCE(am.avg_approval_hours_30d, 0) AS avg_approval_hours_30d,
  CASE 
    WHEN COALESCE(am.applications_submitted_30d, 0) > 0 
    THEN ROUND((COALESCE(am.applications_approved_30d, 0)::numeric / am.applications_submitted_30d::numeric) * 100, 1)
    ELSE 0
  END AS approval_rate_30d,
  
  -- Seat utilization metrics
  COALESCE(sm.total_seats, 0) AS total_seats,
  COALESCE(sm.assigned_seats, 0) AS assigned_seats,
  COALESCE(sm.available_seats, 0) AS available_seats,
  COALESCE(sm.used_seats, 0) AS used_seats,
  COALESCE(sm.orgs_with_unused_seats, 0) AS orgs_with_unused_seats,
  CASE 
    WHEN COALESCE(sm.total_seats, 0) > 0 
    THEN ROUND((COALESCE(sm.used_seats, 0)::numeric / sm.total_seats::numeric) * 100, 1)
    ELSE 0
  END AS seat_utilization_rate,
  
  -- Certificate conversion metrics
  COALESCE(cm.certificates_issued_30d, 0) AS certificates_issued_30d,
  COALESCE(cm.certificates_expired, 0) AS certificates_expired,
  COALESCE(cm.certificates_expiring_soon, 0) AS certificates_expiring_soon,
  COALESCE(um.users_registered_30d, 0) AS users_registered_30d,
  CASE 
    WHEN COALESCE(um.users_registered_30d, 0) > 0 
    THEN ROUND((COALESCE(cm.certificates_issued_30d, 0)::numeric / um.users_registered_30d::numeric) * 100, 1)
    ELSE 0
  END AS certification_conversion_rate_30d,
  
  -- Exam metrics
  COALESCE(em.exams_taken_30d, 0) AS exams_taken_30d,
  COALESCE(em.exams_passed_30d, 0) AS exams_passed_30d,
  COALESCE(em.avg_completion_days_30d, 0) AS avg_completion_days_30d,
  CASE 
    WHEN COALESCE(em.exams_taken_30d, 0) > 0 
    THEN ROUND((COALESCE(em.exams_passed_30d, 0)::numeric / em.exams_taken_30d::numeric) * 100, 1)
    ELSE 0
  END AS exam_pass_rate_30d,
  
  -- Timestamp
  NOW() AS calculated_at
FROM 
  application_metrics am,
  seat_metrics sm,
  certificate_metrics cm,
  user_metrics um,
  exam_metrics em;

-- Grant access to authenticated users with admin role
GRANT SELECT ON public.v_pipeline_metrics TO authenticated;

-- Add comment
COMMENT ON VIEW public.v_pipeline_metrics IS 'Comprehensive pipeline metrics for admin dashboard showing application flow, seat utilization, and certification conversion rates over the last 30 days';