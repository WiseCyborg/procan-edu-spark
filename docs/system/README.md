# ProCannEdu — System Visibility Pack

Generated: 2026-06-06 · Source of truth for the implementation state of ProCannEdu / RVT LMS.

## What's in this folder

| File | Purpose |
|------|---------|
| `01_ROUTE_MAP.md` | Every React route, its guard, and intended audience |
| `02_ROLES_MATRIX.md` | The 3-layer authorization model + role × capability matrix |
| `03_SCHEMA_AND_RLS.md` | 173 public tables grouped by domain, RLS posture, SECURITY DEFINER inventory |
| `04_EDGE_FUNCTIONS.md` | All 210 edge functions, public vs JWT-guarded, by domain |
| `05_CHATBOT_ARCHITECTURE.md` | Internal assistant + voice stack, prompt assembly, escalation path |
| `06_UAT_STATE.md` | Current UAT tables, /uat/feedback flow, reconciliation vs the uploaded build prompt |
| `07_KNOWN_ISSUES_AND_GAPS.md` | Open security findings, gaps, ranked next-steps |

The same content is bundled as **`/mnt/documents/PROCANNEDU_SYSTEM_VISIBILITY.pdf`** for sharing.

## Defaults used to generate this pack

The plan offered three knobs; with no explicit picks back from the user, the safest defaults were applied:

| Knob | Value used | How to change |
|------|------------|---------------|
| Sensitivity | **Structure-only** — no real names, no row-level data, only counts and table shapes. Safe to share externally. | Ask to regenerate with "include real counts" or "internal view". |
| Schema depth | **Medium** — tables, RLS flag, policy intent. Full column lists, FKs, triggers, and SECURITY DEFINER bodies omitted to keep the PDF under 40 pages. | Ask for "full schema dump". |
| Live `/admin/visibility` dashboard | **Not built.** Markdown + PDF only. | Ask: "Also build the live visibility dashboard". |

## How this was assembled

Read-only introspection:
- Routes — parsed from `src/App.tsx` (556 lines, ~95 routes).
- Tables/RLS — `pg_tables` + `pg_policies` (173 tables, RLS = ON on all).
- Functions — `pg_proc` filtered to `nspname='public'` (200+ functions, majority `SECURITY DEFINER`).
- Edge functions — `ls supabase/functions/` (210 dirs) + `supabase/config.toml` (173 `verify_jwt` lines; 106 set to `false`).
- UAT — live counts from `uat_*` tables.
- Storage buckets — `storage.buckets` (7 buckets).

No migrations, no schema changes, no row writes were performed.
