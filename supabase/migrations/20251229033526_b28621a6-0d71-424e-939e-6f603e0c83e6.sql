
-- Complete repairs in single transaction

-- REPAIR 1: Add missing unique_access_key to Hendricks Compliance
UPDATE organizations
SET unique_access_key = 'HC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8))
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND unique_access_key IS NULL;

-- REPAIR 2: Create active join code for Hendricks Compliance (if org exists)
INSERT INTO rvt_join_codes (
  organization_id,
  code,
  max_uses,
  current_uses,
  expires_at,
  is_active
)
SELECT 
  o.id,
  'JOIN-HC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)),
  100,
  0,
  NOW() + INTERVAL '365 days',
  true
FROM organizations o
WHERE o.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND NOT EXISTS (
    SELECT 1 FROM rvt_join_codes jc
    WHERE jc.organization_id = o.id AND jc.is_active = true
  );

-- REPAIR 3: Set COMAR compliance status for all active modules
UPDATE course_modules
SET 
  comar_compliance_status = 'needs_review',
  last_comar_review_date = NOW()
WHERE is_active = true
  AND (comar_compliance_status IS NULL OR last_comar_review_date IS NULL);
