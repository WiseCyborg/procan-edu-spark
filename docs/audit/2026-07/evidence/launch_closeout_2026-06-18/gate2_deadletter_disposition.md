# Gate 2 — Deadletter Queue Disposition

**Initial backlog:** 206 rows in `system_jobs_deadletter`.
**Residual after closeout:** **0**.

## Breakdown and disposition

| job_type | count | first_seen | last_seen | root cause | action |
|---|---:|---|---|---|---|
| `seat_utilization_alert` | 180 | 2025-12-01 | 2026-06-15 | `No handler for job type` — obsolete cron-emitted alerts; no handler ever registered | Archive |
| `trigger_certificate_email` | 13 | 2026-01-03 | 2026-06-16 | `No handler for job type` — superseded by direct `send-transactional-email` invocation in cert pipeline | Archive |
| `send_approval_email` | 7 | 2025-11-04 | 2025-11-04 | Edge Function non-2xx — predates current `send-transactional-email` queue infra | Archive |
| `send_progress_milestone` | 6 | 2026-01-04 | 2026-01-05 | `No handler for job type` — superseded by `employee-progress-milestone` template path | Archive |

**Total archived: 206.**

## Execution

Called `clear-deadletter-queue` edge function once per `job_type` with `{ job_type }`:

```
seat_utilization_alert      → deleted 180
trigger_certificate_email   → deleted  13
send_approval_email         → deleted   7
send_progress_milestone     → deleted   6
                              ─────────
                              total 206
```

Verification:
```sql
SELECT count(*) FROM system_jobs_deadletter;  -- 0
```

## Notes for future prevention

All four obsolete `job_type`s should be either (a) removed from any pg_cron job that emits them, or (b) given a handler in the `system_jobs` processor. Tracked separately — not part of this closeout.

**Exit criteria:** DLQ = 0 or fully documented. ✅ (cleared to 0)
