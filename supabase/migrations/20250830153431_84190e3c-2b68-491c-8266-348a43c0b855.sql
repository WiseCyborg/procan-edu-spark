-- Add admin role to the existing William Cunningham Jr account
INSERT INTO public.user_roles (user_id, role)
SELECT 
    au.id,
    'admin'::app_role
FROM auth.users au
WHERE au.email = 'wisecyborg@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;