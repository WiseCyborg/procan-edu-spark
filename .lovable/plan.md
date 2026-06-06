## Database cleanup plan

Run the user's 4-step SQL as two operations (reads via `supabase--read_query`, writes via `supabase--insert` which accepts DELETE), in order, reporting row counts after each.

### Step 1 — Purge old cron run history
```sql
DELETE FROM cron.job_run_details
WHERE start_time < NOW() - INTERVAL '7 days';
```
Expected: frees ~400MB. Report rows deleted.

### Step 2 — Purge old HTTP response logs
```sql
DELETE FROM net._http_response
WHERE created < NOW() - INTERVAL '7 days';
```
Expected: frees ~20MB. Report rows deleted.

### Step 3 — Inspect `public.system_jobs` columns
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'system_jobs';
```
Read-only; return the column list verbatim so you can confirm naming before any follow-up job-table purge.

### Step 4 — Purge resolved compliance alerts >30 days old
```sql
DELETE FROM public.compliance_alerts
WHERE resolved = true
  AND created_at < NOW() - INTERVAL '30 days';
```
Report rows deleted.

### Not in scope
- No schema changes, no VACUUM, no edge-function or PayPal work.
- No deletes against `system_jobs` in this pass — Step 3 is inspection only; any further purge waits on your review of the column list.
- No changes to RLS, grants, or triggers.

### Deliverable
A single reply with: rows deleted in Steps 1, 2, 4; the column list from Step 3; and any errors (e.g., if `cron.*` / `net.*` aren't reachable from the SQL tool, I'll flag it and ask you to run those two in the Supabase SQL editor).