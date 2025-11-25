-- ================================================================
-- CLEANUP MIGRATION: Fresh Start for Public Pipeline (FINAL)
-- Archives rejected applications, consolidates duplicates, 
-- regenerates tokens (seat reconciliation via edge function afterward)
-- ================================================================

-- 1. Archive rejected applications
UPDATE dispensary_applications 
SET application_status = 'archived'
WHERE application_status = 'rejected';

-- 2. Update dispensary_applications to point to primary organizations
UPDATE dispensary_applications
SET organization_id = '8c6c64ab-1e3d-4904-92ad-12ae3d900b1c'
WHERE organization_id IN (
  '867885cf-0bcf-46c7-ae95-1d91c05d36ad',
  '51e71f84-eb09-4b36-b441-9337cdcc8681',
  '83c9940c-ac9b-4f68-be3c-19bfdcac972b'
);

UPDATE dispensary_applications
SET organization_id = 'ec1620ff-0e5e-4afe-981a-969f29dc7a6d'
WHERE organization_id = '08cf5d37-04a6-4569-a7be-8ae62e9bd08c';

-- 3. Transfer seats from duplicate orgs to primary
UPDATE rvt_seats 
SET organization_id = '8c6c64ab-1e3d-4904-92ad-12ae3d900b1c'
WHERE organization_id IN (
  '867885cf-0bcf-46c7-ae95-1d91c05d36ad',
  '51e71f84-eb09-4b36-b441-9337cdcc8681',
  '83c9940c-ac9b-4f68-be3c-19bfdcac972b'
);

-- 4. Delete duplicate organizations
DELETE FROM organizations 
WHERE id IN (
  '867885cf-0bcf-46c7-ae95-1d91c05d36ad',
  '51e71f84-eb09-4b36-b441-9337cdcc8681',
  '83c9940c-ac9b-4f68-be3c-19bfdcac972b',
  '08cf5d37-04a6-4569-a7be-8ae62e9bd08c'
);

-- 5. Deactivate orphaned join codes
UPDATE rvt_join_codes 
SET is_active = false
WHERE organization_id NOT IN (
  '8c6c64ab-1e3d-4904-92ad-12ae3d900b1c',
  'ec1620ff-0e5e-4afe-981a-969f29dc7a6d',
  '18bfd997-06bb-454e-823d-4923845f640c',
  'f17d1e05-cb1a-4c6c-aa6b-b90f7d57362b'
);

-- 6. Ensure Demo Dispensary LLC has course_credits = 50
UPDATE organizations
SET 
  course_credits = 50,
  updated_at = NOW()
WHERE id = '18bfd997-06bb-454e-823d-4923845f640c';

-- 7. Regenerate registration tokens for approved applications
UPDATE dispensary_applications
SET 
  registration_token = encode(gen_random_bytes(32), 'hex'),
  registration_token_expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE application_status = 'approved'
AND registration_completed = false;

-- 8. Queue approval emails with new tokens
INSERT INTO notification_queue (
  recipient_email,
  subject,
  message,
  scheduled_for,
  priority,
  metadata
)
SELECT 
  contact_email,
  'ProCann Edu - Manager Registration Link (Renewed)',
  'Dear ' || contact_person || E',\n\n' ||
  'Your organization ' || organization_name || ' has been approved!\n\n' ||
  'Register here: https://www.procannedu.com/register/manager?token=' || registration_token || E'\n\n' ||
  'This link expires in 30 days.\n\n' ||
  'Best regards,\nProCann Edu Team',
  NOW(),
  'high',
  jsonb_build_object(
    'application_id', id,
    'token_regenerated', true,
    'expires_at', registration_token_expires_at
  )
FROM dispensary_applications
WHERE application_status = 'approved'
AND registration_completed = false;