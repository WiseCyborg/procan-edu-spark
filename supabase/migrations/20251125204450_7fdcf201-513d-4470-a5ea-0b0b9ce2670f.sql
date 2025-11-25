-- Fix handle_new_user_role trigger to remove role-switching that causes auth failures
-- SECURITY DEFINER already provides elevated privileges, no need to change role

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default student role
  -- SECURITY DEFINER already runs with owner privileges, no need to SET ROLE
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error for debugging but don't fail user creation
    RAISE WARNING 'handle_new_user_role failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;