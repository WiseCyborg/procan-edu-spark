## Two follow-up plans (pick one or both to greenlight)

Both are pre-existing issues uncovered by the 2026-06-16 regression. They are independent and can run in either order, but Plan A should land first because the 75 findings can't be trusted until the agent stops crashing mid-run.

---

### Plan A — Fix `pipeline-health-agent` crash (`supabase.sql` template tags)

**Scope:** One file, one function, no schema change, no behavior change beyond "agent no longer throws."

**Root cause:** `supabase/functions/pipeline-health-agent/index.ts` lines ~261–262 use `supabase.sql\`run_count + 1\`` and `supabase.sql\`success_count + 1\``. `supabase-js` v2 has no `.sql` tagged template — that's Drizzle/pg syntax. The call throws, the agent never writes `agent_configs`, and the snapshot row that downstream UI reads is left stale.

**Fix:** Replace the two tagged-template increments with a read-modify-write that uses values already in scope, OR with a Postgres RPC. Lowest-risk option is the in-function increment because it avoids a new DB object:

1. Before the `agent_configs` update, fetch current counters:
   `const { data: cfg } = await supabase.from('agent_configs').select('run_count, success_count').eq('agent_type','pipeline_health').maybeSingle();`
2. Replace the two `supabase.sql\`...\`` expressions with `(cfg?.run_count ?? 0) + 1` and `(cfg?.success_count ?? 0) + 1`.
3. Leave the rest of the update payload untouched.

**Race-condition note:** The agent runs on a cron with no overlap, so a read-modify-write is safe. If we ever fan it out, swap to a `SECURITY DEFINER` RPC `increment_agent_run_counters(agent_type text, success boolean)` — noted as a follow-up, not in this plan.

**Verification:**
- Redeploy, invoke the function once from Admin → Pipeline Health "Run Agent".
- Confirm `agent_configs.run_count` advances by 1 and `pipeline_health_snapshot.last_run_at` is fresh (< 60s).
- Tail edge logs for the correlation ID — expect no `supabase.sql is not a function` error.

**Out of scope:** Triaging the findings the agent produces (that's Plan B), refactoring the agent, RPC introduction.

**Wall time:** ~5 min including verification.

---

### Plan B — Triage the 75 health-agent findings (23 apps / 23 orgs / 29 seats)

**Scope:** Read-only investigation first, then a categorized remediation plan. No data writes in this plan — writes get their own one-shot plan(s) once categories are known, same pattern as the Vimeo backfill.

**Step 1 — Pull the findings (read-only):**
- `pipeline_health_events` for the latest run's `correlation_id`, grouped by `pipeline_type` (application / organization / seat) and `severity`.
- `pipeline_health_snapshot` for the per-dimension counters that produced the 23/23/29 totals.
- For each dimension, the underlying detector query (already in `child agents` under `supabase/functions/pipeline-health-agent/agents/`) so we know exactly which rows are flagged and why.

**Step 2 — Bucket the 75 into categories.** Expected buckets based on prior audits:
- **Orphans** (e.g. application without profile, seat without entitlement, org without owner).
- **State drift** (e.g. `status='approved'` but no downstream artifact created).
- **Stale/abandoned** (e.g. application > N days in `submitted`).
- **Test/UAT residue** that shouldn't be counted at all → filter rule, not a data fix.

Output of Step 2 is a single markdown table in `docs/audit/2026-07/evidence/health_findings_triage_2026-06-16.md` with: bucket, count, sample IDs, proposed action (auto-fix / manual review / ignore-with-rule), and blast radius.

**Step 3 — Per-bucket remediation plans.** Each bucket that needs writes gets its own short plan you approve separately, executed via the same one-shot service-role pattern we just used (deploy → invoke → delete → 404 probe → evidence). UAT residue gets a detector-filter PR instead of a data write.

**Verification at the end:** Re-run `ops-run-e2e-regression` (or its successor). GO requires `issues_detected` to drop to whatever the agreed steady-state floor is (likely 0 for orphans, non-zero allowed for "stale" if we keep that as informational).

**Out of scope:** Any data writes in this plan. Changing detector thresholds without evidence. Touching the agent code (that's Plan A).

**Wall time:** ~15–20 min for Steps 1–2; per-bucket plans sized when we see the table.

---

### What I need from you

Reply with one of:
- `Plan A` — fix the crash only
- `Plan B` — triage the 75 only
- `Both` — A first, then B (recommended; B's output is meaningless while the agent is throwing)
