-- Phase 1: Fix RLS Infinite Recursion & Add Profile Audit System

-- 1. Create security definer function to check profile ownership (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_own_profile(_user_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = _profile_user_id;
$$;

-- 2. Drop existing recursive policies and create new ones using security definer
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (public.is_own_profile(auth.uid(), user_id))
WITH CHECK (public.is_own_profile(auth.uid(), user_id));

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (public.is_own_profile(auth.uid(), user_id));

-- 3. Create audit trigger for profile changes
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields JSONB := '{}'::JSONB;
  field_name TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Only audit UPDATEs (not INSERTs)
  IF TG_OP = 'UPDATE' THEN
    -- Compare each field and build changed_fields object
    FOR field_name IN 
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'profiles' 
      AND column_name NOT IN ('id', 'user_id', 'created_at', 'updated_at')
    LOOP
      EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO old_val USING OLD;
      EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO new_val USING NEW;
      
      IF old_val IS DISTINCT FROM new_val THEN
        changed_fields := changed_fields || jsonb_build_object(
          field_name, jsonb_build_object(
            'old', old_val,
            'new', new_val
          )
        );
      END IF;
    END LOOP;
    
    -- Only log if something actually changed
    IF changed_fields != '{}'::JSONB THEN
      INSERT INTO public.security_audit_log (
        user_id,
        table_name,
        action_type,
        record_id,
        old_values,
        new_values,
        created_at
      ) VALUES (
        auth.uid(),
        'profiles',
        'PROFILE_UPDATE',
        NEW.id,
        to_jsonb(OLD),
        changed_fields,
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS audit_profile_updates ON public.profiles;
CREATE TRIGGER audit_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_changes();

-- 4. Add helper function to get profile change history
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
    sal.created_at as changed_at,
    sal.user_id as changed_by,
    field.key as field_name,
    field.value->>'old' as old_value,
    field.value->>'new' as new_value
  FROM security_audit_log sal
  CROSS JOIN LATERAL jsonb_each(sal.new_values) AS field(key, value)
  WHERE sal.table_name = 'profiles'
    AND sal.action_type = 'PROFILE_UPDATE'
    AND sal.record_id = (SELECT id FROM profiles WHERE user_id = _user_id)
  ORDER BY sal.created_at DESC
  LIMIT _limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_own_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_change_history TO authenticated;

-- 5. Create notification trigger for critical field changes
CREATE OR REPLACE FUNCTION public.notify_critical_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
  critical_fields TEXT[] := ARRAY['phone', 'address', 'emergency_contact_phone', 'emergency_contact_name'];
  changed_field TEXT;
  user_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Get user's full name
    SELECT COALESCE(first_name || ' ' || last_name, 'Unknown User') INTO user_name
    FROM profiles WHERE user_id = NEW.user_id;
    
    FOREACH changed_field IN ARRAY critical_fields
    LOOP
      IF (to_jsonb(OLD)->>changed_field) IS DISTINCT FROM (to_jsonb(NEW)->>changed_field) THEN
        -- Insert notification for admins
        INSERT INTO notification_queue (
          user_id,
          recipient_email,
          subject,
          message,
          scheduled_for,
          priority,
          metadata
        )
        SELECT 
          ur.user_id,
          au.email,
          'Critical Profile Change Alert',
          format('User %s (%s) changed their %s from "%s" to "%s"',
            user_name,
            au.email,
            changed_field,
            COALESCE(to_jsonb(OLD)->>changed_field, '(empty)'),
            COALESCE(to_jsonb(NEW)->>changed_field, '(empty)')
          ),
          now(),
          'high',
          jsonb_build_object(
            'user_id', NEW.user_id,
            'field_changed', changed_field,
            'old_value', to_jsonb(OLD)->>changed_field,
            'new_value', to_jsonb(NEW)->>changed_field
          )
        FROM user_roles ur
        JOIN auth.users au ON au.id = ur.user_id
        WHERE ur.role = 'admin';
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_critical_profile_updates ON public.profiles;
CREATE TRIGGER notify_critical_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_critical_profile_changes();