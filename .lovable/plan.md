
Goal: clear the remaining blocker list by separating stale test output from real defects, then make the E2E suite deterministic.

1. Re-run the current E2E suite before changing production logic
- The current codebase already contains two of the planned fixes:
  - `run-e2e-validation` now uses a dynamic future `licenseExpiryDate`
  - webhook H1 now accepts `400`
  - entitlement inserts now use `source: 'admin_grant'`
- The blocker output and edge logs still match the older code path (`licenseExpiryDate must be in the future`), so the first step is to verify the latest function version is what actually ran.

2. Tighten the E2E validator so it cannot report stale/false blockers
- Keep the new future expiry date logic.
- Keep `400` as acceptable for the Stripe webhook existence probe.
- Finish the entitlement test cleanup: the fallback duplicate-cleanup query still filters by `source = 'e2e_audit_dup'`, which no longer matches the inserted test rows.
- Update H3/H4 cleanup to remove duplicates by user/course or by collected inserted IDs instead of using the old source marker.

3. Improve dispensary submit diagnostics in the validator
- Right now non-2xx responses collapse into `EDGE_FUNCTION_ERROR`, which hides the real reason.
- Update the validator to capture and record structured response details from `submit-dispensary-application` so future failures clearly show:
  - validation error
  - duplicate application
  - rate limit
  - DB constraint issue
- This will make the test matrix actionable instead of just “non-2xx”.

4. Confirm the production-facing dispensary function behavior
- The function itself looks correct for the current failure:
  - logs confirm validation failed on `licenseExpiryDate`
  - insert and email steps are downstream, not the root cause
- After rerunning with the updated validator, only revisit the edge function if submission still fails with a future expiry date.

5. Refine webhook testing into clearer checks
- Keep H1 as a route-exists health check where `200/204/400/401/403/405` are acceptable.
- Add or plan separate webhook tests for:
  - unsigned POST rejected correctly
  - valid signed Stripe event accepted
- This prevents false blockers on a POST-only endpoint.

6. Expected outcome after implementation
- Dispensary Application Step 4 passes
- DB record verification runs instead of being skipped
- Webhook H1 no longer fails on expected `400`
- H3/H4 entitlement logic uses valid source values and cleans up correctly
- Remaining failures, if any, will reflect real product issues rather than test harness noise

Technical notes
- Confirmed from logs: current dispensary failure is `licenseExpiryDate: License expiry date must be in the future`.
- Confirmed in code: webhook `400` is already considered acceptable.
- Confirmed in code: entitlement insert source is already `admin_grant`, but duplicate cleanup still references `e2e_audit_dup`, so that part is incomplete.
