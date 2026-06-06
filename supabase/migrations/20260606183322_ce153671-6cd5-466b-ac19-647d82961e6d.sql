
DO $$
DECLARE
  acc RECORD;
  v_user_id uuid;
BEGIN
  FOR acc IN
    SELECT * FROM (VALUES
      ('uat+student@test.com',  'student',             'employee', 'UAT', 'Student'),
      ('uat+manager@test.com',  'dispensary_manager',  'manager',  'UAT', 'Manager'),
      ('uat+employee@test.com', 'student',             'employee', 'UAT', 'Employee'),
      ('uat+admin@test.com',    'admin',               'admin',    'UAT', 'Admin')
    ) AS t(email, role, account_type, first_name, last_name)
  LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE email = acc.email;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated',
        acc.email,
        crypt('UATtest123!', gen_salt('bf')),
        now(),
        jsonb_build_object('provider','email','providers',ARRAY['email']),
        jsonb_build_object('first_name', acc.first_name, 'last_name', acc.last_name, 'is_uat_account', true),
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', acc.email, 'email_verified', true),
        'email', v_user_id::text, now(), now(), now()
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = crypt('UATtest123!', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now(),
          raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
            || jsonb_build_object('first_name', acc.first_name, 'last_name', acc.last_name, 'is_uat_account', true)
      WHERE id = v_user_id;
    END IF;

    INSERT INTO public.profiles (user_id, first_name, last_name, email_cache)
    VALUES (v_user_id, acc.first_name, acc.last_name, acc.email)
    ON CONFLICT (user_id) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name  = EXCLUDED.last_name,
          email_cache = EXCLUDED.email_cache;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, acc.role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_journey_state (user_id, current_stage)
    VALUES (v_user_id, 'new_user')
    ON CONFLICT (user_id) DO NOTHING;

    IF EXISTS (SELECT 1 FROM public.uat_accounts WHERE email = acc.email) THEN
      UPDATE public.uat_accounts
      SET user_id = v_user_id,
          account_type = acc.account_type,
          password_hint = 'UATtest123!',
          is_active = true,
          notes = 'Louis/Danielle UAT credentials'
      WHERE email = acc.email;
    ELSE
      INSERT INTO public.uat_accounts (
        user_id, account_type, email, password_hint, notes, is_active
      ) VALUES (
        v_user_id, acc.account_type, acc.email, 'UATtest123!',
        'Louis/Danielle UAT credentials', true
      );
    END IF;
  END LOOP;
END $$;
