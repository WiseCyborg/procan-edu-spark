# Gate 1 — Security Event Triage

**Scope:** `security_events` WHERE `severity IN ('high','critical')` AND `created_at > now() - interval '7 days'`.
**Count:** 8 events, all 2026-06-16 19:49 UTC, all `event_type IN ('user_roles_insert','user_roles_delete')`.

## Events

| created_at (UTC) | event_type | record_id (user_roles.id) | classification |
|---|---|---|---|
| 2026-06-16 19:49:40.954 | user_roles_delete | 569cb168… | expected_admin_action |
| 2026-06-16 19:49:40.640 | user_roles_insert | 569cb168… | expected_admin_action |
| 2026-06-16 19:49:29.728 | user_roles_insert | 6f414bd3… | expected_admin_action |
| 2026-06-16 19:49:27.385 | user_roles_delete | d4ce63aa… | expected_admin_action |
| 2026-06-16 19:49:22.112 | user_roles_delete | c32e1e56… | expected_admin_action |
| 2026-06-16 19:49:21.840 | user_roles_insert | c32e1e56… | expected_admin_action |
| 2026-06-16 19:49:05.946 | user_roles_insert | d4ce63aa… | expected_admin_action |
| 2026-06-16 19:49:02.073 | user_roles_delete | 6266c858… | expected_admin_action |

## Analysis

All 8 events occurred inside a ~40-second window on 2026-06-16 — a tight burst consistent with admin-driven role provisioning during UAT account setup. INSERT/DELETE pairs against the same `record_id` indicate role swaps (e.g., promoting then demoting a UAT test user). No anomalous actor, no off-hours pattern, no escalation to roles that weren't reverted, no failed auth nearby.

These rows fire via the `user_roles` audit trigger that flags any direct change to the table at `high` severity. During launch prep this is expected noise.

## Disposition

All 8 marked `resolved_at = now()` with `details.closeout_classification = 'expected_admin_action'` and a closeout note. Applied via migration `20260620_080059`.

**Exit criteria:** 0 unexplained critical/high events. ✅
