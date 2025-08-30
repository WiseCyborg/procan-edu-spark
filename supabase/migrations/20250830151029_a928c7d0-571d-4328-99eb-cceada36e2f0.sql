-- Create initial admin user and enhance user management
-- Insert admin user (replace with actual admin email)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('admin@procannedu.com', crypt('admin123!', gen_salt('bf')), now(), now(), now())
ON CONFLICT (email) DO NOTHING;

-- Get the admin user ID and create role
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id
    FROM auth.users 
    WHERE email = 'admin@procannedu.com'
    LIMIT 1;
    
    -- Create admin role for this user
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Create admin profile
        INSERT INTO public.profiles (user_id, first_name, last_name)
        VALUES (admin_user_id, 'System', 'Administrator')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- Create enhanced admin management functions
CREATE OR REPLACE FUNCTION public.create_admin_user(
    admin_email TEXT,
    admin_password TEXT,
    first_name TEXT DEFAULT 'Admin',
    last_name TEXT DEFAULT 'User'
)
RETURNS TABLE(user_id UUID, success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_user_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(
        SELECT 1 FROM auth.users WHERE email = admin_email
    ) INTO user_exists;
    
    IF user_exists THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'User already exists';
        RETURN;
    END IF;
    
    -- Create user in auth.users (simplified for demo)
    new_user_id := gen_random_uuid();
    
    -- Create profile
    INSERT INTO public.profiles (user_id, first_name, last_name)
    VALUES (new_user_id, first_name, last_name);
    
    -- Create admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin'::app_role);
    
    RETURN QUERY SELECT new_user_id, TRUE, 'Admin user created successfully';
END;
$$;

-- Function to manage user roles
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

-- Function to get all admin users
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
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
        au.email,
        p.first_name,
        p.last_name,
        p.created_at,
        ARRAY_AGG(ur.role::TEXT) as roles
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.user_id
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role = 'admin'::app_role
    GROUP BY p.user_id, au.email, p.first_name, p.last_name, p.created_at
    ORDER BY p.created_at DESC;
END;
$$;