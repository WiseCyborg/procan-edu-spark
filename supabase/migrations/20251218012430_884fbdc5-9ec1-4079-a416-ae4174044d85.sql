-- Assign admin role to Louis Hendricks (louis@hendrickscompliance.com)
-- User ID: 8e881571-acc1-4aba-9433-95db082eca5f

INSERT INTO public.user_roles (user_id, role)
VALUES ('8e881571-acc1-4aba-9433-95db082eca5f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure he has student role for testing training flow
INSERT INTO public.user_roles (user_id, role)
VALUES ('8e881571-acc1-4aba-9433-95db082eca5f', 'student')
ON CONFLICT (user_id, role) DO NOTHING;