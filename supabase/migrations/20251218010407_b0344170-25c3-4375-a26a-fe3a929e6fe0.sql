-- Create active join code for Demo Dispensary LLC UAT testing
INSERT INTO rvt_join_codes (
  organization_id,
  code,
  max_uses,
  current_uses,
  expires_at,
  is_active,
  created_by
) VALUES (
  '18bfd997-06bb-454e-823d-4923845f640c',
  'UAT-DEMO-2024',
  100,
  0,
  NOW() + INTERVAL '365 days',
  true,
  NULL
) ON CONFLICT DO NOTHING;