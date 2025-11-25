-- Fix handle_new_user trigger to use NULL instead of empty string for last_name
-- This prevents CHECK constraint violation on profiles table

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _first_name TEXT;
  _last_name TEXT;
BEGIN
  -- Parse name from metadata or email
  _first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'firstName',
    split_part(NEW.email, '@', 1)
  );
  
  -- Use NULL instead of empty string to avoid CHECK constraint violation
  _last_name := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'lastName',
    ''
  )), '');

  -- Insert profile with correct column names
  INSERT INTO public.profiles (
    user_id, 
    first_name, 
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    _first_name,
    _last_name,  -- Now will be NULL instead of empty string
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

  RETURN NEW;
END;
$function$;