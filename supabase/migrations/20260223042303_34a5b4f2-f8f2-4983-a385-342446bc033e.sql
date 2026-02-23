
-- exam_checkins: proctor identity verification before exam start
-- Per-attempt model: each exam attempt gets its own check-in record

CREATE TABLE IF NOT EXISTS public.exam_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  photo_url text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'bypassed')),
  bypass_reason text NULL,
  verified_by uuid NULL,
  verified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_checkins_attempt_unique UNIQUE (attempt_id)
);

CREATE INDEX IF NOT EXISTS exam_checkins_user_course_idx
  ON public.exam_checkins (user_id, course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS exam_checkins_status_idx
  ON public.exam_checkins (status, created_at DESC);

-- Enable RLS
ALTER TABLE public.exam_checkins ENABLE ROW LEVEL SECURITY;

-- Employees can SELECT their own check-ins
CREATE POLICY "exam_checkins_employee_select_own"
  ON public.exam_checkins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Employees can INSERT their own check-ins
CREATE POLICY "exam_checkins_employee_insert_own"
  ON public.exam_checkins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Managers/admins can SELECT check-ins for employees in their org
CREATE POLICY "exam_checkins_manager_select_org"
  ON public.exam_checkins FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members mgr
      JOIN public.organization_members emp
        ON emp.user_id = exam_checkins.user_id
       AND emp.organization_id = mgr.organization_id
       AND emp.status = 'active'
      WHERE mgr.user_id = auth.uid()
        AND mgr.status = 'active'
        AND mgr.member_type IN ('manager', 'owner')
    )
  );

-- Managers/admins can UPDATE (verify) check-ins for org employees
CREATE POLICY "exam_checkins_manager_update_verify"
  ON public.exam_checkins FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members mgr
      JOIN public.organization_members emp
        ON emp.user_id = exam_checkins.user_id
       AND emp.organization_id = mgr.organization_id
       AND emp.status = 'active'
      WHERE mgr.user_id = auth.uid()
        AND mgr.status = 'active'
        AND mgr.member_type IN ('manager', 'owner')
    )
  )
  WITH CHECK (
    status IN ('verified', 'bypassed')
    AND verified_by = auth.uid()
  );

-- Employees can update their own check-in to 'bypassed' (self-attest fallback)
CREATE POLICY "exam_checkins_employee_self_attest"
  ON public.exam_checkins FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'bypassed');

-- Enable realtime for exam_checkins
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_checkins;
