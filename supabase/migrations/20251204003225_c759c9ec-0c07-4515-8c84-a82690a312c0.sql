-- Create Hendricks Compliance organization for Louis
INSERT INTO organizations (id, name, contact_person, contact_email, is_active, admin_approved, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Hendricks Compliance',
  'Louis Hendricks',
  'louis@hendrickscompliance.com',
  true,
  true,
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = 'Hendricks Compliance',
  contact_person = 'Louis Hendricks',
  contact_email = 'louis@hendrickscompliance.com',
  is_active = true,
  admin_approved = true;

-- Create profile and assign admin role for Louis (if auth user exists)
DO $$
DECLARE
  louis_user_id uuid;
BEGIN
  SELECT id INTO louis_user_id FROM auth.users WHERE email = 'louis@hendrickscompliance.com';
  
  IF louis_user_id IS NOT NULL THEN
    -- Create/update profile
    INSERT INTO profiles (user_id, first_name, last_name, email_cache, organization_id)
    VALUES (
      louis_user_id,
      'Louis',
      'Hendricks',
      'louis@hendrickscompliance.com',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = 'Louis',
      last_name = 'Hendricks',
      organization_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    
    -- Assign admin role
    INSERT INTO user_roles (user_id, role)
    VALUES (louis_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Louis account configured with admin role';
  ELSE
    RAISE NOTICE 'Louis auth user not found yet - create in Supabase Dashboard first, then re-run this migration';
  END IF;
END $$;