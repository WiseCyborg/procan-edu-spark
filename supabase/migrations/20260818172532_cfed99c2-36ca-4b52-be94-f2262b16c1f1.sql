REVOKE SELECT ON public.courses FROM anon;
GRANT SELECT (
  id, title, description, module_count, passing_score, is_active, created_at, updated_at,
  price_cents, currency, payment_required, course_type, is_public, target_audience,
  completion_badge_name, prerequisite_course_id, prerequisite_required, max_exam_attempts
) ON public.courses TO anon;