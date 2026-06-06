
-- 1) Template catalog for UAT steps
CREATE TABLE IF NOT EXISTS public.uat_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code text NOT NULL UNIQUE,
  role_to_test text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  deep_link text,
  expected_result text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.uat_task_templates TO authenticated;
GRANT ALL ON public.uat_task_templates TO service_role;

ALTER TABLE public.uat_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UAT testers can read templates"
  ON public.uat_task_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.uat_accounts ua WHERE ua.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage templates"
  ON public.uat_task_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Seed the canonical step catalog (4 roles x ~10 steps)
INSERT INTO public.uat_task_templates (task_code, role_to_test, title, description, deep_link, expected_result, sort_order) VALUES
-- PUBLIC VISITOR
('PUB-01','public','Load homepage','Open the marketing homepage in a fresh incognito window and confirm hero, nav, and CTA render without errors.','https://www.procannedu.com/','Page loads under 3s, no console errors, hero CTA visible.',10),
('PUB-02','public','Pricing page renders','Navigate to /pricing and verify all course tiers and prices display correctly.','https://www.procannedu.com/pricing','All 7 course tiers visible with correct prices and CTA buttons.',20),
('PUB-03','public','Submit contact form','Fill the contact form with test details and submit.','https://www.procannedu.com/contact','Success toast appears and a confirmation email arrives in test inbox.',30),
('PUB-04','public','Verify a certificate','Use the public verification portal to look up a known issued certificate by code.','https://www.procannedu.com/verify','Certificate details (name, course, issue date) display as Valid.',40),
('PUB-05','public','QR code deep-link','Scan or open a certificate QR link directly and confirm the verification result.','https://www.procannedu.com/verify/certificate/SAMPLE','Same Valid result loads from deep link with no auth required.',50),
('PUB-06','public','Sign-up flow start','Click Get Started and walk through to the auth screen (do not finish).','https://www.procannedu.com/auth','Auth page renders both Sign in and Sign up tabs without error.',60),
('PUB-07','public','Mobile responsiveness','Open homepage on a phone or with mobile devtools and check nav menu + CTAs.','https://www.procannedu.com/','Mobile menu opens, no horizontal scroll, CTAs tap-target sized.',70),
('PUB-08','public','SEO/meta tags','View page source and confirm title, meta description, and OG tags are present.','https://www.procannedu.com/','Title <60 chars, meta desc <160 chars, OG image set.',80),

-- ORG MANAGER
('MGR-01','dispensary_manager','Sign in as manager','Sign in with manager UAT credentials and land on the org dashboard.','https://www.procannedu.com/auth','Redirects to /dashboard with org context loaded.',10),
('MGR-02','dispensary_manager','View org dashboard metrics','Confirm seat count, active employees, and compliance % render with real data.','https://www.procannedu.com/dashboard','Numbers match what the admin shows in mission control.',20),
('MGR-03','dispensary_manager','Purchase additional seats','Run the Stripe test-card flow to buy 2 extra seats.','https://www.procannedu.com/dashboard?tab=seats','Stripe redirect succeeds; seat count increments after webhook (~10s).',30),
('MGR-04','dispensary_manager','Invite an employee','Send an invite to a fresh test email address from the seats panel.','https://www.procannedu.com/dashboard?tab=team','Invite row appears as Pending; invitation email arrives.',40),
('MGR-05','dispensary_manager','Assign course to seat','Assign a specific course track to the newly invited employee.','https://www.procannedu.com/dashboard?tab=team','Assignment saves and course_entitlements row is created.',50),
('MGR-06','dispensary_manager','Revoke / reassign seat','Revoke the test seat and reassign it to another email.','https://www.procannedu.com/dashboard?tab=seats','Original entitlement deactivated, new invite issued.',60),
('MGR-07','dispensary_manager','Download compliance report','Export the org compliance summary PDF/CSV.','https://www.procannedu.com/dashboard?tab=compliance','File downloads with correct org name and current metrics.',70),
('MGR-08','dispensary_manager','View employee progress','Drill into an employee row and confirm module + exam progress is accurate.','https://www.procannedu.com/dashboard?tab=team','Progress matches what the student sees in their own portal.',80),
('MGR-09','dispensary_manager','Receive owner digest email','Trigger or wait for the owner digest and confirm receipt.','https://www.procannedu.com/dashboard','Digest email arrives with correct metrics within the day.',90),
('MGR-10','dispensary_manager','Sign out / cross-tab','Sign out in one tab, confirm the second tab logs out automatically.','https://www.procannedu.com/dashboard','Both tabs return to /auth within a few seconds.',100),

-- EMPLOYEE / STUDENT
('STU-01','employee','Accept invitation','Open the invitation email link and complete account creation.','https://www.procannedu.com/accept-invitation','Lands on profile completion screen authenticated.',10),
('STU-02','employee','Complete profile to 100%','Fill every required profile field until the meter shows 100%.','https://www.procannedu.com/profile','Profile saves; training nav unlocks (gate satisfied).',20),
('STU-03','employee','Open assigned course','Open the course catalog and click into the assigned course.','https://www.procannedu.com/courses','Course detail page loads with modules listed and CTA Start.',30),
('STU-04','employee','Complete a module','Finish at least one module fully (video + checks).','https://www.procannedu.com/courses','Module marked complete; resume state persists on refresh.',40),
('STU-05','employee','Resume across sessions','Sign out, sign back in, confirm course resumes where left off.','https://www.procannedu.com/courses','Resume CTA returns to the exact module last viewed.',50),
('STU-06','employee','Take the exam check-in','Start the exam and complete the webcam photo check-in.','https://www.procannedu.com/exam','Check-in selfie captured and exam unlocks.',60),
('STU-07','employee','Pass the exam','Complete all exam questions and pass on the first attempt.','https://www.procannedu.com/exam','Score above passing threshold; certificate auto-issued.',70),
('STU-08','employee','Download certificate','Download the issued certificate PDF.','https://www.procannedu.com/profile?tab=certificates','PDF downloads with correct name, course, cert ID, and QR.',80),
('STU-09','employee','Verify own certificate','Use the public verify portal with own cert code.','https://www.procannedu.com/verify','Cert returns Valid with matching details.',90),
('STU-10','employee','Idle timeout auto-save','Leave the course screen idle 30 min; return and confirm progress saved.','https://www.procannedu.com/courses','Modal warns at timeout, progress saved on auto-logout.',100),

-- PLATFORM ADMIN
('ADM-01','admin','Sign in as admin','Log in with admin credentials and reach /admin.','https://www.procannedu.com/admin','Mission Control loads with system health, no permission errors.',10),
('ADM-02','admin','Approve org application','Approve a pending dispensary application from the queue.','https://www.procannedu.com/admin?tab=organizations','Status flips to approved; manager receives notification email.',20),
('ADM-03','admin','Verify metrics parity','Compare a key metric (active certs) between Mission Control and a DB query.','https://www.procannedu.com/admin','Numbers match the source-of-truth view exactly.',30),
('ADM-04','admin','Reset a user exam state','Use the exam reset utility on a test student.','https://www.procannedu.com/admin?tab=users','Exam attempts cleared; student can retake immediately.',40),
('ADM-05','admin','Activate a stuck user','Run the activate-user tool on the test account.','https://www.procannedu.com/admin?tab=users','User journey unblocks and they can sign in normally.',50),
('ADM-06','admin','Review audit timeline','Open the unified audit timeline and filter by the test user.','https://www.procannedu.com/admin?tab=audit','Chronological events render with correct actor, target, and time.',60),
('ADM-07','admin','Check edge function logs','Open Supabase edge function logs for notification-queue-processor.','https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc/functions','No 5xx errors in the last hour; canary heartbeats green.',70),
('ADM-08','admin','Run security scan','Trigger the in-app security scan and review findings.','https://www.procannedu.com/admin?tab=security','Scan completes; no new critical findings introduced.',80),
('ADM-09','admin','Send admin broadcast','Send a test announcement to all org managers.','https://www.procannedu.com/admin?tab=communications','Message delivered; recipients see it in notification center.',90),
('ADM-10','admin','Deprovision a test user','Soft-revoke the test student account.','https://www.procannedu.com/admin?tab=users','Sessions invalidated; entitlements deactivated, audit row written.',100)
ON CONFLICT (task_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  deep_link = EXCLUDED.deep_link,
  expected_result = EXCLUDED.expected_result,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 3) RPC: start a new UAT run, cloning all templates into uat_tasks
CREATE OR REPLACE FUNCTION public.start_uat_run(p_organization_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_run_id uuid;
  v_code text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.uat_accounts WHERE user_id = v_user)
     AND NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not a UAT tester';
  END IF;

  v_code := 'UAT-' || to_char(now(),'YYYYMMDD-HH24MI') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,4);

  INSERT INTO public.uat_runs (organization_id, run_code, status, started_by, started_at)
  VALUES (p_organization_id, v_code, 'in_progress', v_user, now())
  RETURNING id INTO v_run_id;

  INSERT INTO public.uat_tasks (
    run_id, organization_id, task_code, title, description,
    role_to_test, deep_link, expected_result, status, priority, assigned_to
  )
  SELECT v_run_id, p_organization_id, t.task_code, t.title, t.description,
         t.role_to_test, t.deep_link, t.expected_result, 'pending', t.priority, v_user
  FROM public.uat_task_templates t
  ORDER BY t.role_to_test, t.sort_order;

  RETURN v_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_uat_run(uuid) TO authenticated;

-- 4) RPC: submit/upsert a step's result
CREATE OR REPLACE FUNCTION public.submit_uat_step(
  p_task_id uuid,
  p_result text,           -- 'pass' | 'fail' | 'skip'
  p_notes text DEFAULT NULL,
  p_evidence_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_run uuid;
  v_email text;
  v_role text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT run_id, role_to_test INTO v_run, v_role FROM public.uat_tasks WHERE id = p_task_id;
  IF v_run IS NULL THEN
    RAISE EXCEPTION 'task not found';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  UPDATE public.uat_tasks
  SET status = CASE p_result WHEN 'pass' THEN 'complete' WHEN 'fail' THEN 'blocked' ELSE 'skipped' END,
      evidence = p_notes,
      evidence_file_path = COALESCE(p_evidence_path, evidence_file_path),
      completed_at = CASE WHEN p_result = 'pass' THEN now() ELSE completed_at END,
      completed_by = v_user,
      updated_at = now()
  WHERE id = p_task_id;

  INSERT INTO public.uat_evidence (
    run_id, task_id, tester_email, role_used,
    action_performed, actual_result, screenshot_path, passed, notes
  ) VALUES (
    v_run, p_task_id, COALESCE(v_email,''), v_role,
    'Step executed via /uat/feedback', COALESCE(p_notes,''), p_evidence_path,
    p_result = 'pass', p_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_uat_step(uuid, text, text, text) TO authenticated;
