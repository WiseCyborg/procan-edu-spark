
-- Migration C: Tighten remaining RLS gaps (S-6, S-8, S-10). S-9 (realtime.messages) is in a reserved schema; handled below via a public-schema policy where appropriate.

-- ===== consumer_enrollments (S-6) =====
DROP POLICY IF EXISTS "Users can view their own consumer enrollments" ON public.consumer_enrollments;
DROP POLICY IF EXISTS "Users can create consumer enrollments" ON public.consumer_enrollments;
DROP POLICY IF EXISTS "Users can update their own consumer enrollments" ON public.consumer_enrollments;

CREATE POLICY "Users view own consumer enrollments"
  ON public.consumer_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own consumer enrollments"
  ON public.consumer_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own consumer enrollments"
  ON public.consumer_enrollments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages consumer enrollments"
  ON public.consumer_enrollments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.consumer_enrollments FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.consumer_enrollments TO authenticated;
GRANT ALL ON public.consumer_enrollments TO service_role;

-- ===== covered_sessions (S-8) =====
DROP POLICY IF EXISTS "Users can view sessions they host or participate in" ON public.covered_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.covered_sessions;
DROP POLICY IF EXISTS "Hosts and admins can update sessions" ON public.covered_sessions;

CREATE POLICY "Users view sessions they host or participate in"
  ON public.covered_sessions
  FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = covered_sessions.id AND sp.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'training_coordinator'::app_role)
  );

CREATE POLICY "Authenticated users create sessions"
  ON public.covered_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts and admins update sessions"
  ON public.covered_sessions
  FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages covered sessions"
  ON public.covered_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.covered_sessions FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.covered_sessions TO authenticated;
GRANT ALL ON public.covered_sessions TO service_role;

-- ===== call-recordings storage bucket (S-10) =====
DROP POLICY IF EXISTS "System can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view recordings from their calls" ON storage.objects;

CREATE POLICY "Call participants upload recordings"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'call-recordings'
    AND EXISTS (
      SELECT 1 FROM public.video_calls vc
      JOIN public.video_call_participants vcp ON vcp.call_id = vc.id
      WHERE vc.room_name = (storage.foldername(objects.name))[1]
        AND vcp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role uploads recordings"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'call-recordings');

CREATE POLICY "Participants view call recordings"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'call-recordings'
    AND (
      EXISTS (
        SELECT 1 FROM public.video_calls vc
        JOIN public.video_call_participants vcp ON vcp.call_id = vc.id
        WHERE vc.room_name = (storage.foldername(objects.name))[1]
          AND vcp.user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
