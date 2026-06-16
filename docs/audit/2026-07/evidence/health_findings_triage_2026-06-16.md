# Pipeline Health Findings Triage — 2026-06-16

**Source:** `pipeline_health_events` rows from the 2026-06-16 19:48 UTC run
**Snapshot row:** `pipeline_health_snapshot.id=f4f0e9ef…` — `issues_detected=75`, `needs_admin_attention=23`, `auto_fixed_today=33`
**Agent-config row:** `agent_configs.pipeline_health` `run_count=0`, `last_run_at=NULL` — confirms the `supabase.sql` crash described in Plan A; snapshot wrote, counters did not.

## Step 1 — Raw distribution (last 24h)

| Pipeline | Issue type | Severity | Requires admin | Auto-fixed | Count |
|---|---|---|---|---|---|
| application | stuck_after_approval | critical | yes | no | 11 |
| application | stuck_in_pending | critical | yes | no | 1 |
| application | missing_registration_token | warning | no | **yes** | 11 |
| organization | duplicate_license | critical | yes | no | 3 |
| organization | no_registration_token | critical | yes | no | 8 |
| organization | unregistered_manager | info | no | no | 10 |
| organization | expired_registration_token | warning | no | **yes** | 1 |
| organization | orphaned_profiles | warning | no | no | 1 |
| seat | low_utilization | info | no | no | 7 |
| seat | seat_overage | info | no | no | 1 |
| seat | missing_join_code | warning | no | **yes** | 10 |
| seat | orphaned_assigned_seats | warning | no | **yes** | 1 |
| seat | seat_deficit_fixed | warning | no | **yes** | 10 |

**Cross-check vs snapshot counters (23 apps / 23 orgs / 29 seats = 75):**
apps = 11+1+11 = 23 ✓ orgs = 3+8+10+1+1 = 23 ✓ seats = 7+1+10+1+10 = 29 ✓

33 events were auto-fixed (matches `auto_fixed_today=33`). 23 require admin (matches `needs_admin_attention=23`).

## Step 2 — Buckets

### Bucket 1 — UAT residue (largest; should not block GO)
- 10 of the 11 `application:stuck_after_approval` rows are `UAT *` org names (`UAT Test Dispensary`, `UAT Test Dispensary 2/3/5`, `UAT Final`, `UAT Final2`, `UAT Clean`, `UAT Green Run`, `UAT Dispensary Final`, `UAT Dispensary Final Run`), all "approved 113 days ago".
- 1 of the `application:stuck_in_pending` is an `E2E Test Org 50e59fb8`, 20 days old.
- Several of the `organization:no_registration_token` rows are `E2E Test Org *` and `ABC` test orgs.
- **Action:** detector-filter PR. Exclude orgs where `legal_business_name ILIKE 'UAT %' OR ILIKE 'E2E Test Org %' OR legal_business_name = 'ABC'` (or, cleaner, an `is_test` flag on `organizations` populated for the seeded UAT entities). No data writes.
- **Estimated drop:** ~15 of 23 admin-attention items disappear; `issues_detected` drops to ~60.

### Bucket 2 — Real "stuck_after_approval" / "stuck_in_pending" (production)
- 1 of the 11 stuck-after-approval is `"ABC"` approved **134** days ago (different from the test ABC orgs above — needs a row-level inspection of `dispensary_applications`/`organizations` to confirm).
- **Action:** manual triage by an admin in `dispensary_applications` (which onboarding step is incomplete?). Likely one-shot fix or contact owner.
- **Plan:** sized after Bucket 1 filter is in place so the signal is clean.

### Bucket 3 — Duplicate licenses (3 rows, critical)
- `DA-23-12345`, `DA-25-12345`, `123456689` — each used by 2 orgs.
- **Action:** every duplicate is a data-integrity issue with legal implications. Manual admin review to pick the canonical org and either merge or revoke the duplicate. Not auto-fixable.
- **Plan:** one-shot service-role review function that lists the affected org pairs (members, seats, certificates) → admin decides → second one-shot performs the chosen merge/revoke. Two micro-plans, both per-pair.

### Bucket 4 — Orgs missing manager & registration token (8 rows, critical, mixed)
- Includes `Greenleaf xo`, `Test Dispensary LLC`, `ABC` variants, plus a few `E2E Test Org *` (which fall into Bucket 1 once the filter lands).
- **Action:** for each real org, either (a) generate a registration token + email the owner of record, or (b) mark dormant. Bucket 1 filter will already strip the test rows.
- **Plan:** one-shot `ops-issue-registration-tokens` service-role function that takes an allow-list of org IDs and inserts a fresh token via the existing token issuance path; tear down after run.

### Bucket 5 — Informational, no action
- 10 `unregistered_manager` (info)
- 7 `low_utilization` (info)
- 1 `seat_overage` (info)
- 1 `orphaned_profiles` (warning, not auto-fixed but low-risk)
- **Action:** none. These are reporting signals, not pipeline breaks. Keep visible in admin UI; do not let them affect GO/NO-GO. Consider moving `info` rows out of `issues_detected` and into a separate `informational_count` field in `pipeline_health_snapshot` (schema change — separate plan if desired).

### Bucket 6 — Already auto-fixed (33 rows, no action)
- 11 `missing_registration_token`, 1 `expired_registration_token`, 10 `missing_join_code`, 1 `orphaned_assigned_seats`, 10 `seat_deficit_fixed`.
- **Action:** none. These are evidence the agent self-heals. They should not be in `issues_detected` going forward — recommend the agent count auto-fixed events under `auto_fixed_today` only, not under `issues_detected`. (Same detector-filter PR can do this.)

## Step 3 — Proposed remediation plans (each separate, your approval)

| # | Plan | Type | Risk | Pre-req |
|---|---|---|---|---|
| B1 | Detector filter: exclude UAT/E2E/`ABC` test orgs; stop double-counting auto-fixed events | Code-only PR to `pipeline-health-agent/agents/*` | Low | Plan A merged |
| B2 | One-shot review of the 3 duplicate-license pairs (read-only enumeration of org pairs + members + seats + certs) | Read-only EF, self-deleting | None | B1 |
| B3 | Per-pair resolution one-shots (one per duplicate license, after admin chooses canonical) | Service-role EF, self-deleting | Medium — touches `organizations` | B2 + admin decision |
| B4 | One-shot `ops-issue-registration-tokens` for the real orgs in Bucket 4 | Service-role EF, self-deleting | Low — additive only | B1 |
| B5 | Manual triage of the 1 production stuck_after_approval (`ABC`, 134d) and the 1 stuck_in_pending (`E2E Test Org 50e59fb8` — likely Bucket 1) | Admin task, no code | None | B1 |
| B6 (optional) | Schema: split `issues_detected` into `actionable_count` + `informational_count` | Migration | Low | — |

## Verification target after B1–B5

Re-run `ops-run-e2e-regression` (or its successor). Expected post-cleanup snapshot:
- `issues_detected` ≤ 5 (Bucket 5 info rows only, or 0 if B6 ships)
- `needs_admin_attention` = 0
- `pipelines_healthy` = `pipelines_total` (6/6)

Anything above those thresholds = NO-GO and re-triage.

## Files / artifacts

- This file: `docs/audit/2026-07/evidence/health_findings_triage_2026-06-16.md`
- Source query: `SELECT pipeline, issue_type, organization_id, description, auto_fixed, requires_admin FROM pipeline_health_events WHERE created_at > now() - interval '24 hours'`
- Snapshot row: `pipeline_health_snapshot.id = f4f0e9ef-fcf9-4640-a8ab-37fc05d3f438`
