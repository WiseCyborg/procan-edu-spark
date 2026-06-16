# Duplicate License Resolution — Sign-off Worksheet

**Date drafted:** 2026-06-16
**Drafted by:** Lovable AI (B2/B3 of go-live blocker batch)
**Status:** AWAITING DECISION OWNER SIGNATURE

## Context

Three Maryland dispensary license numbers are attached to two `organizations`
rows each. The pipeline-health detector will keep firing on these as
duplicates until each pair is reduced to one row.

All six rows trace back to a single tester (`daniellebrooks502@gmail.com`)
and all are named "ABC" — they look like test residue, not real
customer-facing data. None have an `is_active = false` flag yet.

## How resolution works

Once the decision owner signs each section below, an admin invokes the
`resolve-duplicate-license` edge function (one-shot, service-role,
admin-only) with the chosen `keep_org_id` / `retire_org_id`. The function:

1. Reparents `organization_members`, `rvt_purchases`, `rvt_seats`,
   `rvt_join_codes`, `dispensary_applications`, `staff_invitations`,
   `org_invites` from the retired org to the kept org.
2. Marks the retired org `is_active = false`, sets `license_number = NULL`,
   appends `[retired YYYY-MM-DD]` to its name.
3. Writes an `admin_operations_audit` row stamped with the decision owner.
4. Refuses to run if BOTH orgs have members (manual merge required).

## Worksheet

### License `123456689`

| Org ID | Created | Name | Contact | Members | Purchases | Seats | Apps | Recommendation |
|---|---|---|---|---|---|---|---|---|
| `ec1620ff-0e5e-4afe-981a-969f29dc7a6d` | 2025-11-04 | ABC (trailing space) | daniellebrooks502@gmail.com | 0 | 2 | 19 | 0 | **KEEP** (oldest, most purchase activity) |
| `e5dc4020-9068-4057-ae06-23a2cf665771` | 2025-12-22 | ABC | daniellebrooks502@gmail.com | 0 | 1 | 1 | 0 | RETIRE |

Decision owner: ______________________  Decision: keep ___________  retire ___________  Date: __________

### License `DA-23-12345`

| Org ID | Created | Name | Contact | Members | Purchases | Seats | Apps | Recommendation |
|---|---|---|---|---|---|---|---|---|
| `4e88f15d-e48c-4fef-81af-c39324a42c3f` | 2026-01-24 | ABC | daniellebrooks502@gmail.com | 0 | 1 | 2 | 0 | RETIRE (older but smaller) |
| `44df12e6-1e2e-42a8-9b94-5439cec80d38` | 2026-02-01 | ABC | daniellebrooks502@gmail.com | 0 | 1 | 10 | 0 | **KEEP** (more seats already issued) |

Decision owner: ______________________  Decision: keep ___________  retire ___________  Date: __________

### License `DA-25-12345`

| Org ID | Created | Name | Contact | Members | Purchases | Seats | Apps | Recommendation |
|---|---|---|---|---|---|---|---|---|
| `7c21124c-3966-43d6-b1c7-c6ed4bd2a4a3` | 2026-01-03 | ABC | daniellebrooks502@gmail.com | **1** | 3 | 1 | 0 | **KEEP** (has the only member of any pair) |
| `4b6fb7ee-b2e8-42b5-8113-8d6f5dc7c36b` | 2026-02-01 | ABC | daniellebrooks502@gmail.com | 0 | 1 | 10 | 1 | RETIRE |

Decision owner: ______________________  Decision: keep ___________  retire ___________  Date: __________

> Note: `DA-25-12345` has the only application (`applications=1`) attached to
> the row recommended for retirement, but the reparent step moves it to the
> kept org, so the application is preserved either way.

## Alternate path: scrub all six

If Danielle/Louis confirm that all six rows are test data with no real
customers behind them, the cleaner action is to soft-delete all six (set
`is_active = false`, NULL the license) rather than merge. That bypasses the
edge function entirely. Pick this path only with explicit owner sign-off.

## Execution log (to be filled in)

| License | Executed at | Executed by | Result |
|---|---|---|---|
| 123456689 |  |  |  |
| DA-23-12345 |  |  |  |
| DA-25-12345 |  |  |  |
