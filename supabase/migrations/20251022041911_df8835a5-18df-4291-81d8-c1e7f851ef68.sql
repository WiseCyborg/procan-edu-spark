-- PHASE 1: EMERGENCY HOTFIXES

-- Fix 1.1: Restore Database Triggers
-- Drop existing triggers if they exist (cleanup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Recreate profile creation trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate role assignment trigger  
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Fix 1.2: Fix RLS Policy for Service Role
-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Service role can create profiles during registration" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Add comprehensive INSERT policy that allows both user and service role
CREATE POLICY "Users and service role can create profiles"
ON profiles FOR INSERT
WITH CHECK (
  current_setting('role'::text) = 'service_role' OR
  auth.uid() = user_id
);

-- PHASE 2: DATA RECOVERY & VALIDATION

-- Fix 2.1: Backfill Missing Profiles for Existing Users
-- Create profiles for auth.users who don't have profiles
INSERT INTO profiles (user_id, first_name, last_name, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  au.created_at,
  au.created_at
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Assign student role to users without roles
INSERT INTO user_roles (user_id, role)
SELECT au.id, 'student'
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- PHASE 3: ENHANCED MONITORING & ALERTING

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fix 3.1: Deploy Form Submission Guardian Agent Cron Job
SELECT cron.schedule(
  'monitor-form-submissions-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/monitor-form-submissions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA'
    ),
    body := jsonb_build_object('scheduled', true)
  ) as request_id;
  $$
);

-- Fix 3.2: Deploy Profile Failure Monitor Agent Cron Job
SELECT cron.schedule(
  'monitor-profile-failures-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/monitor-profile-failures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA'
    ),
    body := jsonb_build_object('scheduled', true)
  ) as request_id;
  $$
);