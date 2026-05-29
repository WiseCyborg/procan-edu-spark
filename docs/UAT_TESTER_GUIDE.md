# ProCannEdu UAT Tester Guide

Welcome Dani & Louis — thanks for helping us validate the platform before launch.

## 1. Your Accounts

| Tester | Email | Password | Role |
|--------|-------|----------|------|
| Louis  | louis@hendrickscompliance.com | `ProCann2025!Welcome` | Admin |
| Dani   | (provisioned separately)      | (sent via invite)    | Admin |

> Change your password on first login via **Profile → Security**.

## 2. Where to Start

1. Go to https://www.procannedu.com/auth and sign in.
2. Land on the **Admin Dashboard** (`/admin`).
3. Open **Operations Command Center → Regression tab** and click **Run E2E Validation**.
   - Expect `SHIPPABLE` status with all green checks.

## 3. Day-1 Test Path (≈45 min)

1. **Application flow** — submit a test dispensary application from an incognito window, then approve it from `/admin`.
2. **Seat purchase** — buy 2 seats for the test org (Stripe test mode card `4242 4242 4242 4242`).
3. **Employee invite** — invite a test employee (use your own +alias email).
4. **Training** — log in as the employee, complete Module 0, verify Module 1 unlocks.
5. **Exam** — jump to the final exam (admin can unlock), pass with ≥80%, confirm certificate generates.
6. **Verify certificate** — scan the QR or visit `/verify/<code>`.

## 4. Day-2 Test Path (≈30 min)

- Manager dashboard: team progress, compliance report.
- Coordinator: seat reassignment, reminder send.
- Admin: org approval queue, system health, user deprovision/reprovision.
- Renewal: trigger annual recertification flow on an expired test cert.

## 5. Reporting Bugs

For every issue, capture:
- **URL** and **role** (admin/manager/employee)
- **Steps to reproduce**
- **Expected vs actual**
- **Console errors** (DevTools → Console) and **screenshot**

Send to: `bugs@procannedu.com` with subject `[UAT] <short title>`.

## 6. Known Issues / Caveats

- The auto-regression cron requires a one-time Vault secret installation by engineering (not blocking manual runs).
- LiveActivityTicker only shows real exam-pass events — quiet on a fresh DB.
- Public certificate verification page is rate-limited (10/min per IP).

## 7. Emergency Contacts

- Engineering on-call: see `docs/PRODUCTION_RUNBOOK.md`
- Lovable platform issues: Slack `#procannedu-build`

## 8. Admin Setup Appendix (one-time, engineering only)

Install the service-role secret for auto-regression:

```sql
select vault.create_secret(
  '<SERVICE_ROLE_KEY>',
  'service_role_key',
  'Used by post-migration-regression cron'
);
```

Then enable the pg_cron schedule from the Regression tab.

---
*Last updated: 2026-05-29*
