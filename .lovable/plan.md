Current state: the Lovable project is linked to an unresolved Supabase project ref `zhmpwczrvitomsxjwpzc`. The `.env` still contains the old `VITE_SUPABASE_*` values, and several source/config files hardcode that same ref. Reconnecting Supabase via Lovable will repopulate `.env` automatically, but the hardcoded references in code must then be updated to match the new project.

Plan

1. Reconnect Supabase through Lovable UI
   - Project Settings → Integrations/Supabase → Disconnect the unresolved connection.
   - Connect Supabase again: either create a new project or link an existing one in your Supabase organization.
   - This automatically writes the new `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` into `.env`.

2. Capture the new project ref
   - After reconnecting, read the new `.env` values (or the Cloud view) to get the new project ID and URL.

3. Update hardcoded project references in code
   Replace the old ref everywhere it is baked into runtime/published code:
   - `supabase/config.toml` — `project_id`
   - `src/integrations/supabase/client.ts` — `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (auto-generated file; update if it does not regenerate)
   - `src/config/domains.ts` — `SUPABASE` domain constant
   - `src/lib/publicEdgeFunctions.ts` — `SUPABASE_URL`
   - `supabase/functions/_shared/domains.ts` — `SUPABASE` domain constant
   - `src/pages/admin/VideoLibrary.tsx` — `SUPABASE_PROJECT_REF`
   - `scripts/load-test-registration.ts` — `SUPABASE_URL`
   - `src/pages/SystemHealthDashboard.tsx` — Supabase dashboard link
   - `src/components/admin/PayPalManagementPanel.tsx` — Supabase dashboard link
   - `src/pages/EmployersPage.tsx` — example endpoint string shown in UI

4. Verify environment and types
   - Confirm `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` are present in `.env`.
   - Run TypeScript checks to ensure no broken references.

5. Redeploy edge functions (if needed)
   - If a new Supabase project is created, the existing edge functions and database schema will need to be redeployed/reapplied so the app works against the new backend.

Out of scope
   - Historical audit/docs files under `docs/` will not be rewritten.
   - No database migrations will be created unless the new project requires schema seeding.

Next step
   Please reconnect Supabase in Project Settings, then reply with the new project ref (or confirm the Cloud view shows a resolved connection) so I can update the hardcoded references.