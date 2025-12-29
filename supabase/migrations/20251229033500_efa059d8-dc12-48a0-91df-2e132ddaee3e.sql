
-- REPAIR 4: Log the seat mismatch for ABC org (using valid status 'detected')
INSERT INTO system_integrity_checks (
  check_type,
  severity,
  status,
  affected_entity_type,
  affected_entity_id,
  issue_description,
  suggested_fix,
  technical_details,
  auto_fixable,
  detected_at
)
SELECT
  'excess_seats',
  'low',
  'detected',
  'organization',
  'ec1620ff-0e5e-4afe-981a-969f29dc7a6d',
  'ABC organization has 9 more seats than expected (19 vs 10 course_credits)',
  'Review seat allocation - may be intentional buffer or manual addition',
  jsonb_build_object(
    'expected_seats', 10,
    'actual_seats', 19,
    'excess', 9
  ),
  false,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM system_integrity_checks 
  WHERE affected_entity_id = 'ec1620ff-0e5e-4afe-981a-969f29dc7a6d'
    AND check_type = 'excess_seats'
);
