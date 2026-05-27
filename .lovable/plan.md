# Execute Pre-Production Security Migrations A, B, C

Approved sequence — three migrations plus one frontend swap. Each migration is applied independently so failures are isolated.

## Migration A — Lock down sensitive tables to service_role

Tables: `email_verification_codes`, `staff_invitations`, `exam_attempts`, `chat_intent_log`

- Drop all existing `TO public` / `USING (true)` permissive policies on these tables.
- Revoke `anon` and `authenticated` grants; keep `service_role` only (edge functions already use service role server-side).
- Re-enable RLS, add a single `service_role` ALL policy on each (defense in depth).
- Owner-scoped read for `exam_attempts` retained for `authenticated` where `auth.uid() = user_id` so the candidate can see their own attempt history in-app.

Affected flows still work because they all go through edge functions:
- Signup verification → `verify-email-code` (service role)
- Invite acceptance → `staff-invitation-manager` (service role)
- Exam start → `start-exam` (service role)
- Chat intent → `chat-assistant*` (service role)

## Migration B — Certificate + join-code lockdown with public verification RPC

Tables: `user_certificates`, `consumer_certificates`, `rvt_join_codes`

- Drop public-read policies; restrict base tables to owner + service_role.
- Create `public.verify_certificate_public(p_code text)` as `SECURITY DEFINER`, `STABLE`, `SET search_path = public`. Returns only: `certificate_number`, `course_title`, `recipient_display_name` (first name + last initial), `issue_date`, `expiry_date`, `is_revoked`, `status`. No raw PII, no IDs, no internal columns.
- `GRANT EXECUTE ON FUNCTION public.verify_certificate_public(text) TO anon, authenticated`.
- Equivalent `verify_consumer_certificate_public` and `verify_rvt_join_code_public` for the other two tables (RVT returns only validity + session label).

Frontend change: `src/pages/SecureCertificateVerification.tsx`
- Replace the direct `from('certificates').select(...)` query with `supabase.rpc('verify_certificate_public', { p_code: certificateNumber })`.
- Keep the existing authenticated/admin full-detail path (it still queries `certificates` directly — RLS will scope it to owner + admin).
- Update the `FullCertificate` type and rendering for the public path to match the limited shape.

## Migration C — Tighten remaining RLS gaps

- `consumer_enrollments`: drop permissive policies, add `auth.uid() = user_id` for select/insert/update; service_role ALL.
- `covered_sessions`: scope select to participants (`auth.uid() IN (host_user_id, attendee_user_ids)`) or org members via `has_role`; insert restricted to authenticated hosts; service_role ALL.
- `realtime.messages`: add policy requiring `auth.role() = 'authenticated'` for broadcast/presence inserts; deny anon.
- `call-recordings` storage bucket: drop public policies; add INSERT policy scoped to session participants (path-prefix check `auth.uid()::text = (storage.foldername(name))[1]`); SELECT scoped to participants + org admins via `has_role`.

## Verification after each migration

- Run `security--get_scan_results` — confirm corresponding S-x items cleared.
- Run `supabase--linter` — confirm no new ERROR-level findings introduced.
- After all three: re-run `run-e2e-validation` twice, confirm 49/49 both runs, regenerate `/mnt/documents/PRE_PROD_READINESS_REPORT.md` with SHIPPABLE verdict.

## What is NOT changed

- No business logic, pricing, course content, or admin UI.
- No edits to `auth`, `storage` schema tables (only `storage.objects` policies, which is supported).
- No data writes outside RLS/policy/grant DDL.
- `src/integrations/supabase/types.ts` will auto-regenerate after Migration B adds the new RPCs.
