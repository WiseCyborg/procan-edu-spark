
-- First add unique constraint on user_id, then sync UAT accounts
ALTER TABLE uat_accounts ADD CONSTRAINT uat_accounts_user_id_unique UNIQUE (user_id);

-- Sync existing UAT users to uat_accounts tracking table
INSERT INTO uat_accounts (user_id, account_type, email, password_hint, organization_id, created_by, notes, is_active)
SELECT 
  p.user_id,
  CASE 
    WHEN p.email_cache ILIKE '%manager%' THEN 'manager'
    WHEN p.email_cache ILIKE '%employee%' THEN 'employee'
    ELSE 'employee'
  END as account_type,
  p.email_cache as email,
  'ProCann2024!' as password_hint,
  p.organization_id,
  (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1) as created_by,
  'Synced from existing UAT profile' as notes,
  true as is_active
FROM profiles p
WHERE p.email_cache ILIKE '%uat%' OR p.first_name = 'UAT'
ON CONFLICT (user_id) DO NOTHING;
