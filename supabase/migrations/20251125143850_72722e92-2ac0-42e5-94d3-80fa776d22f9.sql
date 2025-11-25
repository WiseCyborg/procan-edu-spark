-- Fix 5 & 4: Clean up duplicates and add prevention constraint
-- Handle preferred_start_date constraint by nullifying it for old records

-- Step 1: Mark duplicate applications as rejected (keep most recent)
WITH duplicates AS (
  SELECT 
    contact_email,
    COUNT(*) as count
  FROM public.dispensary_applications
  WHERE application_status IN ('pending', 'approved')
  GROUP BY contact_email
  HAVING COUNT(*) > 1
),
ranked_apps AS (
  SELECT 
    da.id,
    da.contact_email,
    da.application_status,
    da.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY da.contact_email 
      ORDER BY 
        CASE WHEN da.application_status = 'approved' THEN 1 ELSE 2 END,
        da.created_at DESC
    ) as rn
  FROM public.dispensary_applications da
  INNER JOIN duplicates d ON d.contact_email = da.contact_email
  WHERE da.application_status IN ('pending', 'approved')
)
UPDATE public.dispensary_applications
SET 
  application_status = 'rejected',
  preferred_start_date = NULL, -- Clear date to avoid constraint violation
  admin_notes = COALESCE(admin_notes, '') || 
    E'\n[SYSTEM CLEANUP ' || NOW()::date || '] Auto-rejected duplicate email. Most recent application kept active.'
FROM ranked_apps
WHERE public.dispensary_applications.id = ranked_apps.id
  AND ranked_apps.rn > 1;

-- Step 2: Disable duplicate organizations (keep first created)
WITH duplicate_orgs AS (
  SELECT 
    LOWER(TRIM(name)) as normalized_name,
    COUNT(*) as count
  FROM public.organizations
  WHERE admin_approved = true
  GROUP BY LOWER(TRIM(name))
  HAVING COUNT(*) > 1
),
ranked_orgs AS (
  SELECT 
    o.id,
    o.name,
    o.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(o.name))
      ORDER BY o.created_at ASC
    ) as rn
  FROM public.organizations o
  INNER JOIN duplicate_orgs d ON LOWER(TRIM(o.name)) = d.normalized_name
  WHERE o.admin_approved = true
)
UPDATE public.organizations
SET admin_approved = false
FROM ranked_orgs
WHERE public.organizations.id = ranked_orgs.id
  AND ranked_orgs.rn > 1;

-- Step 3: Add duplicate prevention constraint
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_dispensary_application_email 
ON public.dispensary_applications (LOWER(TRIM(contact_email)))
WHERE application_status IN ('pending', 'approved');

-- Step 4: Log cleanup with actual counts
INSERT INTO public.security_audit_log (
  user_id,
  table_name,
  action_type,
  record_id,
  new_values,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dispensary_applications',
  'DUPLICATE_CLEANUP',
  '00000000-0000-0000-0000-000000000000',
  jsonb_build_object(
    'action', 'duplicate_prevention',
    'timestamp', NOW(),
    'apps_cleaned', (
      SELECT COUNT(*) FROM public.dispensary_applications 
      WHERE application_status = 'rejected' 
      AND admin_notes LIKE '%SYSTEM CLEANUP%'
    ),
    'constraint_added', true
  ),
  NOW()
);

COMMENT ON INDEX unique_active_dispensary_application_email IS 
  'Prevents duplicate pending/approved applications (case-insensitive email)';