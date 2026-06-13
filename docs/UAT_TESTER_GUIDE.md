# ProCannEdu UAT Tester Guide

Welcome Dani & Louis — thanks for helping us validate the platform before launch.

## 1. Your Accounts

| Tester | Email | Password | Role |
|--------|-------|----------|------|
| Louis  | louis@hendrickscompliance.com   | `ProCann2025!Welcome` | Admin |
| Dani   | daniellebrooks502@gmail.com     | (use **Forgot password** on first visit) | Admin |

> Both accounts are confirmed and have full admin scope. Change your password on first login via **Profile → Security**.

## 2. Suggested Start Date

**Sunday 2026-06-14** — the platform is ready now; targeting Sunday gives us Saturday to triage any new issues you surface in pre-flight.

## 3. Where to Start

1. Go to https://www.procannedu.com/auth and sign in.
2. Land on the **Admin Dashboard** (`/admin`).
3. Open **Operations Command Center → Regression tab** and click **Run E2E Validation**.
   - Expect `SHIPPABLE` status with all green checks.

## 4. Seeded Demo Data (already loaded)

To avoid an empty platform on day one, we seeded one realistic test org so dashboards have something to show:

- **Org:** Sunrise Wellness MD (Baltimore, MD)
- **Employees:**
  - `jordan.reyes@sunrise-wellness-uat.com` — mid-training
  - `morgan.chen@sunrise-wellness-uat.com` — certified (active green-tier cert)
  - `alex.parker@sunrise-wellness-uat.com` — expired cert (good for testing renewal flow)
- **Password for all three:** `UATTester2026!`

Admins can wipe this entire dataset in one click from `/admin/uat-controls`.

## 5. Day-1 Test Path (≈45 min)

1. **Application flow** — submit a test dispensary application from an incognito window, then approve it from `/admin`.
2. **Seat purchase** — buy 2 seats for the test org (Stripe test mode card `4242 4242 4242 4242`).
3. **Employee invite** — invite a test employee (use your own +alias email).
4. **Training** — log in as Jordan Reyes (mid-training), complete the next module, verify the next one unlocks.
5. **Certificate verification** — scan the QR on Morgan's cert or visit `/verify/<code>`.
6. **Renewal flow** — log in as Alex Parker (expired) and walk through annual recertification.

## 6. Day-2 Test Path (≈30 min)

- Manager dashboard: team progress, compliance report for Sunrise Wellness MD.
- Coordinator: seat reassignment, reminder send.
- Admin: org approval queue, system health, user deprovision/reprovision.
- UAT controls: `/admin/uat-controls` — try purge + re-seed to confirm it's idempotent.

## 7. Reporting Bugs

For every issue, capture:
- **URL** and **role** (admin/manager/employee)
- **Steps to reproduce**
- **Expected vs actual**
- **Console errors** (DevTools → Console) and **screenshot**

**Primary path:** in-app feedback form at `/uat/feedback` (writes directly to `uat_evidence`).

**Backup path (email):**
**Backup path (email):** all of the addresses below forward into the single triage mailbox **info@procannedu.com**. There are **no Gmail filters** that auto-route by alias — the team triages manually during UAT.
- `bugs@procannedu.com` — bug reports
- `support@procannedu.com` — general help
- Personal aliases also live: `danielle@procannedu.com`, `louis@procannedu.com`, `william@procannedu.com` (forwarded to info@ + visibility copies)

See `docs/SUPPORT_ROUTING_MODEL.md` for the full routing model.

Subject line: `[UAT] <short title>`.

## 8. Known Issues / Weekend Caveats

- **Training videos still served via Vimeo until Monday.** Fully functional — the migration to our private Supabase bucket happens after Friday's spend-cap upgrade. No impact on testing.
- **LiveActivityTicker** will be quiet outside Sunrise Wellness MD activity until more real orgs come online.
- **Public certificate verification page** is rate-limited (10/min per IP).

## 9. Emergency Contacts

- Engineering on-call: see `docs/PRODUCTION_RUNBOOK.md`
- Lovable platform issues: Slack `#procannedu-build`

## 10. Admin one-time setup (engineering)

If the nightly regression cron isn't running, visit `/admin/uat-controls` → **Install / refresh secret**.
This calls the `install-regression-vault-secret` edge function which stores the service-role key in Vault under `service_role_key`. Idempotent.

---
*Last updated: 2026-06-11*
