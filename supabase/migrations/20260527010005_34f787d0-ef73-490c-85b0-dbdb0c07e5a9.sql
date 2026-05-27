
-- Migration A: Lock down sensitive tables to service_role only (S-1, S-2, S-3, S-7)

-- ===== email_verification_codes (S-1) =====
DROP POLICY IF EXISTS "Service role can manage verification codes" ON public.email_verification_codes;
CREATE POLICY "Service role manages verification codes"
  ON public.email_verification_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Keep: "Users can view their own verification codes" (scoped to auth.uid())

REVOKE ALL ON public.email_verification_codes FROM anon;
GRANT SELECT ON public.email_verification_codes TO authenticated;
GRANT ALL ON public.email_verification_codes TO service_role;

-- ===== staff_invitations (S-2) =====
DROP POLICY IF EXISTS "Service role can manage staff invitations" ON public.staff_invitations;
CREATE POLICY "Service role manages staff invitations"
  ON public.staff_invitations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Keep org_managers_* policies (scoped to authenticated org admins)

REVOKE ALL ON public.staff_invitations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_invitations TO authenticated;
GRANT ALL ON public.staff_invitations TO service_role;

-- ===== exam_attempts (S-3) =====
DROP POLICY IF EXISTS "Service role can manage exams" ON public.exam_attempts;
CREATE POLICY "Service role manages exams"
  ON public.exam_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- Keep owner-scoped SELECT / INSERT / DELETE policies, but restrict them to authenticated
DROP POLICY IF EXISTS "Users can view their own exam attempts" ON public.exam_attempts;
CREATE POLICY "Users can view their own exam attempts"
  ON public.exam_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own exam attempts" ON public.exam_attempts;
CREATE POLICY "Users can insert their own exam attempts"
  ON public.exam_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own incomplete attempt stubs" ON public.exam_attempts;
CREATE POLICY "Users can delete own incomplete attempt stubs"
  ON public.exam_attempts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND completed_at IS NULL AND total_score = 0);

REVOKE ALL ON public.exam_attempts FROM anon;
GRANT SELECT, INSERT, DELETE ON public.exam_attempts TO authenticated;
GRANT ALL ON public.exam_attempts TO service_role;

-- ===== chat_intent_log (S-7) =====
DROP POLICY IF EXISTS "Service role manages intent logs" ON public.chat_intent_log;
CREATE POLICY "Service role manages intent logs"
  ON public.chat_intent_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.chat_intent_log FROM anon, authenticated;
GRANT ALL ON public.chat_intent_log TO service_role;
