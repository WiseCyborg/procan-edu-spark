# Mission Control — Unified Operations Summary

- **Generated:** 2026-06-18 (live DB snapshot)
- **Environment:** production (Supabase ref `zhmpwczrvitomsxjwpzc`)
- **Source:** single `supabase--read_query` aggregate against public tables
- **Overall verdict:** 🟡 **CONDITIONAL GO** — training/cert pipeline healthy and data integrity reconciled; payments idle (no live transactions in 30d), system_jobs deadletter backlog and security event volume need triage before public launch.

---

## 1. Launch Readiness (data integrity)

| Metric | Value | Status |
|---|---|---|
| Modules total | 46 | — |
| Modules with valid Vimeo mapping | 17 | — |
| Modules tagged `unmapped_reason` (accepted exclusions) | 29 | 🟢 |
| Real unmapped (no reason, no valid video) | **0** | 🟢 |
| Orphan video assets (`module_id IS NULL`) | 4 | 🟡 |

**Accepted exclusion breakdown**
- `awaiting_correct_vimeo_id_2026-06-17`: 6 (RVT Groups 1–5)
- `consumer_course_text_only`: 22 (Cannabis 101, First Time at a Dispensary, MD Cannabis Laws)
- `storage_hosted_orientation`: 1 (RVT mod 0, `.mp4` in storage)

> Note: the launch-readiness RPCs (`get_launch_readiness`, `count_unmapped_modules`) are `SECURITY DEFINER` and not callable by the read role from this evidence pull; numbers above are computed from the same source tables those RPCs aggregate.

---

## 2. Training & Certification

| Metric | 7d | 30d | All-time |
|---|---:|---:|---:|
| Course completions | 0 | 0 | 2 |
| Certificates issued | 1 | 1 | 1 |
| Exam attempts | — | 2 | — |
| Exam passes | — | 1 | — |
| Exam pass rate (30d) | — | **50%** | — |

- Active courses: **7 / 7**
- Status: 🟡 — pipeline functional but volume is pre-launch / UAT only.

---

## 3. Payments & Entitlements

| Metric | 7d | 30d |
|---|---:|---:|
| Payments count | 0 | 0 |
| Gross | $0 | $0 |

- Entitlements by source: `org_seat = 9` (only). No Stripe/PayPal-sourced entitlements yet.
- Status: 🟡 — payment surface live but **no real transactions recorded**; webhook → entitlement path is unverified in production. Run a $1 Stripe + PayPal sandbox round-trip before flipping live traffic.

---

## 4. Organizations & Seats

- Organizations total: **23** (all active, 0 pending approval)
- Org members: 7
- Pending staff invitations: **1**
- Pending org invitations: 0
- Status: 🟢

---

## 5. Access & Identity

- Role distribution: `admin = 4`, `dispensary_manager = 3`, `student = 16`
- Pending role requests: 0
- Profiles total: 17
- Security events (7d): **12 total**, **8 high/critical** ⚠️
- Status: 🟠 — security event volume warrants triage; review `security_events` last 7d before launch.

---

## 6. Email & Comms Health

- Email outbox pending/queued: 0
- Circuit breakers open: 0
- Status: 🟢

---

## 7. System Jobs & Integrations

- `system_jobs` failed: 0
- `system_jobs_deadletter`: **206** ⚠️
- Status: 🟠 — deadletter backlog should be triaged or archived before launch; no active failures but the historical residue is high.

---

## 8. Compliance & COMAR

- Open compliance incidents: 0
- Latest COMAR version row: **none present** in `comar_versions`
- Status: 🟠 — `comar_versions` table is empty; if compliance UI depends on it, seed an initial active version row before launch.

---

## 9. GO/NO-GO Matrix

| Domain | Status | Reason |
|---|---|---|
| Data integrity (modules) | 🟢 | 0 real unmapped, 29 documented exclusions |
| Video assets | 🟡 | 4 orphan `video_assets` remain |
| Training pipeline | 🟢 | Active, pass-rate computable |
| Certificates | 🟢 | Issuance verified (1 cert) |
| Payments | 🟡 | No live transactions to validate webhooks |
| Organizations / seats | 🟢 | 23 active, 0 pending |
| Access / identity | 🟠 | 8 high-severity security events in 7d |
| Email | 🟢 | No queue, no open breakers |
| System jobs | 🟠 | 206 deadletter entries |
| Compliance | 🟠 | `comar_versions` empty |

**Overall:** 🟡 **CONDITIONAL GO** — clear training/certification data, but pre-launch checklist:
1. Triage `security_events` last 7d (8 high/critical).
2. Archive or replay the 206 deadletter jobs.
3. Seed `comar_versions` with the active reference.
4. Run a sandbox Stripe + PayPal round-trip to confirm entitlement creation.
5. Resolve the 4 orphan `video_assets` (link or archive).

---

## Appendix — Raw counts (JSON)

```json
{
  "courses_active": 7,
  "courses_total": 7,
  "modules_total": 46,
  "modules_with_video": 17,
  "modules_with_reason": 29,
  "modules_real_unmapped": 0,
  "orphan_video_assets": 4,
  "modules_reason_breakdown": {
    "awaiting_correct_vimeo_id_2026-06-17": 6,
    "consumer_course_text_only": 22,
    "storage_hosted_orientation": 1
  },
  "completions": { "7d": 0, "30d": 0, "all": 2 },
  "certs": { "7d": 1, "30d": 1, "total": 1 },
  "exam_attempts_30d": 2,
  "exam_pass_30d": 1,
  "payments_7d": { "count": 0, "gross": 0 },
  "payments_30d": { "count": 0, "gross": 0 },
  "entitlements_by_source": { "org_seat": 9 },
  "orgs": { "total": 23, "active": 23, "pending_approval": 0 },
  "org_members_total": 7,
  "pending_staff_invites": 1,
  "pending_org_invites": 0,
  "roles_dist": { "admin": 4, "dispensary_manager": 3, "student": 16 },
  "role_requests_pending": 0,
  "security_events_7d": 12,
  "security_events_7d_high": 8,
  "system_jobs_failed": 0,
  "system_jobs_dead": 206,
  "compliance_incidents_open": 0,
  "comar_latest": null,
  "email_outbox_pending": 0,
  "email_breakers_open": 0,
  "profiles_total": 17
}
```

### SQL used
A single aggregated `SELECT jsonb_build_object(...)` across:
`courses, course_modules, video_assets, course_completions, certificates, exam_attempts, payments, course_entitlements, organizations, organization_members, staff_invitations, org_invites, user_roles, role_requests, security_events, system_jobs, system_jobs_deadletter, compliance_incidents, comar_versions, email_outbox, email_circuit_breaker, profiles`.
