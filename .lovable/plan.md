## Persisted security scan — raw findings (read-only report)

Scanners reporting clean: `supabase`, `connector_security_scan`, `supply_chain`.
Scanner with findings: `supabase_lov` (3 findings, all severity `warn`).

### 1. `dispensary_applications_public_insert_no_select_guard` — warn
Dispensary applications table allows public INSERT of contact PII (email, phone, name, license_number, registration_token). Need to verify the BEFORE-INSERT trigger reliably nulls `registration_token` before any read-back path can expose plaintext.

### 2. `org_invites_plaintext_token_column` — warn
`org_invites` retains a plaintext `token` column alongside `token_hash`. Need to confirm a BEFORE-INSERT trigger unconditionally nulls `token` so plaintext is never persisted (defense-in-depth if a SELECT policy is ever added).

### 3. `password_reset_tokens_plaintext_token` — warn
`password_reset_tokens` has plaintext `token` column alongside `token_hash`. Same pattern: needs BEFORE-INSERT trigger that hashes into `token_hash` and nulls `token`, matching `staff_invitations` / `org_invites`.

### Note on the 202 "findings" from run_security_scan
The unpersisted scan returned 202 entries, but those are linter rule definitions (no `internal_id`), almost entirely repeats of `SUPA_anon_security_definer_function_executable` and `SUPA_authenticated_security_definer_function_executable`. They are not actionable via `manage_security_finding` and are not tracked as persisted findings.

## Next step — awaiting your decision
Tell me which finding(s) to fix (or "all three"). On approval I'll:
1. Inspect the existing BEFORE-INSERT triggers on each table via `supabase--read_query`.
2. For any table where the trigger is missing/incomplete: add or repair a BEFORE-INSERT trigger that hashes the secret into the `*_hash` column and sets the plaintext column to NULL, plus a `CHECK (<plaintext_col> IS NULL)` constraint to enforce at-rest invariant.
3. Run a verification query confirming no row has a non-null plaintext value.
4. Mark the resolved findings via `manage_security_finding` with an explanation of the fix.

No code changes will happen until you approve.
