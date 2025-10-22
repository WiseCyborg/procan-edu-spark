-- Phase 3: Create user_verification_preferences table with RLS
CREATE TABLE IF NOT EXISTS public.user_verification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_method TEXT NOT NULL DEFAULT 'email',
  phone_number TEXT,
  backup_method TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_verification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own verification preferences"
  ON public.user_verification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification preferences"
  ON public.user_verification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification preferences"
  ON public.user_verification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Phase 4: Fix audit trigger for profile changes
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  field_name TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Only audit UPDATEs
  IF TG_OP = 'UPDATE' THEN
    -- Check each field and log changes individually
    FOREACH field_name IN ARRAY ARRAY['first_name', 'last_name', 'phone', 'address', 'city', 'state', 'zip_code', 'emergency_contact_name', 'emergency_contact_phone', 'job_title', 'organization', 'date_of_birth', 'mca_registration_number']
    LOOP
      EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO old_val USING OLD;
      EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO new_val USING NEW;
      
      -- Only log if value actually changed
      IF old_val IS DISTINCT FROM new_val THEN
        -- Insert individual log entry for each field change
        INSERT INTO public.security_audit_log (
          user_id,
          action_type,
          record_id,
          table_name,
          old_values,
          new_values,
          created_at
        ) VALUES (
          NEW.user_id,
          'PROFILE_UPDATE',
          NEW.id,
          'profiles',
          jsonb_build_object(field_name, old_val),
          jsonb_build_object(field_name, new_val),
          NOW()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS audit_profile_updates ON public.profiles;
CREATE TRIGGER audit_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_changes();

-- Fix RPC function for profile change history
CREATE OR REPLACE FUNCTION public.get_profile_change_history(_user_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE(
  changed_at timestamp with time zone,
  changed_by uuid,
  field_name text,
  old_value text,
  new_value text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sal.created_at AS changed_at,
    sal.user_id AS changed_by,
    (jsonb_each(sal.new_values)).key AS field_name,
    (jsonb_each(sal.old_values)).value::text AS old_value,
    (jsonb_each(sal.new_values)).value::text AS new_value
  FROM security_audit_log sal
  WHERE sal.user_id = _user_id
    AND sal.action_type = 'PROFILE_UPDATE'
    AND sal.table_name = 'profiles'
  ORDER BY sal.created_at DESC
  LIMIT _limit;
END;
$$;