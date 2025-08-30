-- Fix admin access system with simpler approach
-- Function to create admin user (simplified)
CREATE OR REPLACE FUNCTION public.create_initial_admin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result_message TEXT;
BEGIN
    -- This is a simplified function that admins can use to set up initial access
    -- The actual user creation should be done through the Supabase auth system
    
    result_message := 'Admin setup function ready. Use Supabase Auth to create admin@procannedu.com with password admin123!';
    
    RETURN result_message;
END;
$$;

-- Function to manage user roles (enhanced)
CREATE OR REPLACE FUNCTION public.manage_user_role(
    target_user_id UUID,
    new_role app_role,
    action TEXT -- 'add' or 'remove'
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required';
        RETURN;
    END IF;
    
    IF action = 'add' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, new_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RETURN QUERY SELECT TRUE, 'Role added successfully';
    ELSIF action = 'remove' THEN
        DELETE FROM public.user_roles
        WHERE user_id = target_user_id AND role = new_role;
        
        RETURN QUERY SELECT TRUE, 'Role removed successfully';
    ELSE
        RETURN QUERY SELECT FALSE, 'Invalid action. Use "add" or "remove"';
    END IF;
END;
$$;

-- Function to get all users with roles for admin management
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE(
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    roles TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.user_id,
        p.first_name,
        p.last_name,
        p.created_at,
        COALESCE(ARRAY_AGG(ur.role::TEXT) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::TEXT[]) as roles
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
    GROUP BY p.user_id, p.first_name, p.last_name, p.created_at
    ORDER BY p.created_at DESC;
END;
$$;