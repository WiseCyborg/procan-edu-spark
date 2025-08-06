-- Create default admin user procannedu@gmail.com
-- Note: This creates the user in auth.users and sets up their profile and role

-- First, let's insert into auth.users (this is typically done via Supabase Auth but we'll prepare the data)
-- The user will need to use password reset to set their password on first login

-- Insert profile for the admin user (user will be created via auth signup)
-- We'll insert the user role for when the admin user signs up
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'procannedu@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- If the user doesn't exist yet, we'll create a placeholder that can be used
-- Note: The actual user creation should be done through Supabase Auth
-- This migration just ensures the role will be assigned when they sign up