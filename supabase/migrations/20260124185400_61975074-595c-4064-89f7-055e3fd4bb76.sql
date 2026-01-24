
-- Add Danielle Brooks to organization_members as manager for ABC org
INSERT INTO organization_members (
  user_id,
  organization_id,
  email,
  role,
  member_type,
  status
) VALUES (
  'a24da592-d73d-49cd-9521-385e9a6e3c59',
  '7c21124c-3966-43d6-b1c7-c6ed4bd2a4a3',
  'daniellebrooks502@gmail.com',
  'dispensary_admin',
  'manager',
  'active'
);
