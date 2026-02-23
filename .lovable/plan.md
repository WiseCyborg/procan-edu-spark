# First Green Run — Minimal Fix Plan

## Problem Summary

The enterprise pipeline has all the tables and UI in place, but 5 critical write paths are broken or missing, meaning zero successful end-to-end executions exist in the database.

## Fix 1: Seat Assignment Must Create `course_entitlements` (HIGHEST)

**What's broken**: `OrgSeatsManagementTab.tsx` line 91 (`handleAssignSeat`) updates `rvt_seats` status to `assigned` but never creates a `course_entitlements` row. The `accept-org-invite` function (line 184) also assigns seats without creating entitlements.

**Fix**: After every seat assignment (both admin UI and invite acceptance), upsert into `course_entitlements`:

### A) `OrgSeatsManagementTab.tsx` -- add entitlement upsert after seat update (line 102)

After `if (error) throw error;`, add:

```typescript
// Get the seat's course_id
const { data: seatData } = await supabase
  .from('rvt_seats')
  .select('course_id')
  .eq('id', seatId)
  .single();

if (seatData?.course_id) {
  await supabase.from('course_entitlements').upsert({
    user_id: userId,
    course_id: seatData.course_id,
    source: 'seat_allocation',
    status: 'active',
    purchased_at: new Date().toISOString(),
    metadata: { seat_id: seatId, organization_id: organizationId }
  }, { onConflict: 'user_id,course_id' });
}
```

### B) `accept-org-invite/index.ts` -- add entitlement after seat allocation (line 201)

After the seat allocation success log, add:

```typescript
await serviceClient.from('course_entitlements').upsert({
  user_id: user.id,
  course_id: enrollmentResult.courseId,
  source: 'seat_allocation',
  status: 'active',
  purchased_at: new Date().toISOString(),
  metadata: { seat_id: availableSeat.id, organization_id: invite.organization_id }
}, { onConflict: 'user_id,course_id' });
```

### C) Unassign must revoke entitlement

In `handleUnassignSeat` (line 113), after unsetting the seat, also update the entitlement:

```typescript
// Revoke entitlement when seat is unassigned
const { data: seatData } = await supabase
  .from('rvt_seats')
  .select('course_id, assigned_user_id')
  .eq('id', seatId)
  .single();

if (seatData?.assigned_user_id && seatData?.course_id) {
  await supabase.from('course_entitlements')
    .update({ status: 'revoked' })
    .eq('user_id', seatData.assigned_user_id)
    .eq('course_id', seatData.course_id);
}
```

---

## Fix 2: Module Completion Must Write `course_completions` (HIGHEST)

**What's broken**: `useUserProgress.tsx` writes to `user_progress` (module-level) and updates `user_learning_journey`, but never writes to `course_completions`. The `evaluate_and_issue_certificate` DB function does write `course_completions`, but only when a certificate is issued -- meaning the completion record is absent until certificate time.

**Fix**: In `useUserProgress.tsx` `onSuccess` callback (around line 128), after checking tier unlocks, add a `course_completions` upsert when all required modules are complete:

```typescript
// After completedCount calculation (line 135)
if (variables.isCompleted && completedCount >= REQUIRED_FOR_EXAM) {
  try {
    await supabase.from('course_completions').upsert({
      user_id: user.id,
      course_id: variables.courseId,
      completion_percent: Math.min(completionPercentage, 100),
      passed: false // Will be set to true after exam pass
    }, { onConflict: 'user_id,course_id' });
  } catch (e) {
    console.error('Failed to upsert course_completions:', e);
  }
}
```

This ensures `course_completions` exists as soon as modules are done, even before exam/certificate.

---

## Fix 3: Certificate Pipeline -- Add `certificate_audit_log` + Fix `pdf_url` (HIGHEST)

**What's broken**: The `generate-certificate` edge function (the exam-based path) writes to `certificates` but:

- Never writes `user_certificates` (verification code)
- Never writes `certificate_audit_log`
- Never sets `pdf_url`

The `evaluate_and_issue_certificate` DB function (consumer/multi-course path) writes `user_certificates` and `course_completions` but also never writes `certificate_audit_log`.

**Fix A**: Add `certificate_audit_log` write to `generate-certificate/index.ts` after certificate creation (line 279):

```typescript
// Write certificate audit log
await supabase.from('certificate_audit_log').insert({
  certificate_id: certificate.id,
  action: 'ISSUED',
  actor_id: user.id,
  ip_address: req.headers.get('x-forwarded-for') || 'unknown',
  user_agent: req.headers.get('user-agent') || 'unknown',
  metadata: {
    certificate_number: certificate.certificate_number,
    course_id: examAttempt.course_id,
    exam_attempt_id,
    certification_type: certificationType
  }
});
```

**Fix B**: Add `user_certificates` write to `generate-certificate/index.ts` (after certificate insert):

```typescript
// Create user_certificates record with verification code
const verificationCode = `${certificationType === 'manager' ? 'MGR' : 'RVT'}-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;

await supabase.from('user_certificates').insert({
  user_id: user.id,
  course_id: examAttempt.course_id,
  certificate_name: certificationType === 'manager' ? 'Manager Leadership Certificate' : 'RVT Agent Certificate',
  verification_code: verificationCode,
  recipient_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email,
  metadata: {
    certificate_number: certificate.certificate_number,
    exam_score: exam_results.total_score
  }
});
```

**Fix C**: Add `course_completions` upsert to `generate-certificate/index.ts`:

```typescript
await supabase.from('course_completions').upsert({
  user_id: user.id,
  course_id: examAttempt.course_id,
  completion_percent: 100,
  passed: true
}, { onConflict: 'user_id,course_id' });
```

**Fix D**: Add audit log to `evaluate_and_issue_certificate` DB function via a migration that adds `certificate_audit_log` insert after the `user_certificates` insert.

**Fix E (pdf_url)**: The `pdf_url` requires PDF generation infrastructure (jsPDF or server-side). For the "first green run", set `pdf_url` to a placeholder that points to the certificate verification page:

```typescript
// Update certificate with pdf_url after creation
await supabase.from('certificates')
  .update({ pdf_url: `https://procannedu.lovable.app/verify/${certificate.certificate_number}` })
  .eq('id', certificate.id);
```

---

## Fix 4: Org Creation Must Create `organization_members` (HIGH)

**What's broken**: 11/12 orgs have no `organization_members` row. The `approve-with-roles` and `accept-org-invite` functions do create members, but the direct org creation path does not.

**Where to fix**: The dispensary application approval flow (`approve-with-roles/index.ts`) already creates `organization_members` (line 165). The gap is likely in direct org creation paths.

**Fix**: Add a database trigger on `organizations` INSERT that auto-creates an `organization_members` row for the creating user. This is the most reliable approach since it catches all creation paths.

Migration SQL:

```sql
CREATE OR REPLACE FUNCTION public.auto_create_org_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if no membership exists yet
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = NEW.id AND user_id = auth.uid()
  ) AND auth.uid() IS NOT NULL THEN
    INSERT INTO organization_members (
      organization_id, user_id, email, role, status, member_type
    )
    SELECT 
      NEW.id, auth.uid(), 
      COALESCE(p.email_cache, u.email, 'unknown'),
      'manager', 'active', 'manager'
    FROM auth.users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_org_membership
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_org_membership();
```

---

## Fix 5: Payment Traceability Enhancement (MEDIUM)

**Fix**: In `allocate-seats-on-payment/index.ts`, ensure `event_data` includes `user_id` when writing `payment_audit_log`. Currently the function doesn't write to `payment_audit_log` at all -- it writes to `communication_logs`. Add:

```typescript
await supabase.from('payment_audit_log').insert({
  order_id: payment_id,
  event_type: 'seats_purchased',
  event_data: {
    user_id,
    organization_id,
    quantity,
    amount: quantity * 49.99,
    currency: 'USD'
  }
});
```

---

## Files Changed (Summary)


| File                                                    | Change                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/components/admin/OrgSeatsManagementTab.tsx`        | Add entitlement upsert on assign/revoke on unassign                                          |
| `supabase/functions/accept-org-invite/index.ts`         | Add entitlement upsert after seat allocation                                                 |
| `src/hooks/useUserProgress.tsx`                         | Add `course_completions` upsert when all modules done                                        |
| `supabase/functions/generate-certificate/index.ts`      | Add `user_certificates`, `certificate_audit_log`, `course_completions`, and `pdf_url` writes |
| `supabase/functions/allocate-seats-on-payment/index.ts` | Add `payment_audit_log` write with user_id                                                   |
| New migration                                           | Trigger for auto org membership + update `evaluate_and_issue_certificate` to write audit log |


## Acceptance Criteria

After these fixes, the following must be true:

1. Assign seat --> `course_entitlements` row exists
2. Complete all modules --> `course_completions` row exists
3. Pass exam + generate certificate --> `certificates.pdf_url` is not null, `user_certificates` has verification code, `certificate_audit_log` has ISSUED event
4. Create org --> `organization_members` row exists
5. `unified_audit_timeline` shows certificate events for the user
6. Purchase seats --> `payment_audit_log` has user-linkable data  
  
confirm with  
  
Got it — using your plan as the baseline, here’s the **confirm/double-check pass** with the exact places I’d tighten to avoid false greens, race conditions, or RLS surprises. I’m not changing your intent; I’m making sure the “First Green Run” is actually provable in DB and doesn’t introduce a new class of bugs.
  ---
  ## ✅ Overall verdict
  Your plan is directionally correct and targets the real blockers. The only “watch-outs” are:
  1. **Front-end writes to entitlements/completions** can be blocked by RLS or create integrity gaps (it’s okay for a first green run, but be deliberate).
  2. **Unassign entitlement update** should use the “previous assigned user” before the seat is cleared (your snippet queries after unsetting, which may lose the user_id).
  3. **Org membership trigger using** `auth.uid()` is risky because triggers run without request context; `auth.uid()` often returns null unless the insert is executed under the authenticated role with JWT claims. You need a fallback or move this to an RPC/edge function.
  4. **Placeholder** `pdf_url` pointing to verify page is fine for “green,” but make sure you don’t represent it as a PDF in UI (or rename field semantics later).
  5. **Payment audit logging** should include enough to link the purchase to seat creation (`purchase_id`) and org/user.
  Below is the “double-check” pass by fix.
  ---
  # Fix 1: Seat assignment → course_entitlements
  ### ✅ Confirmed good
  - You found the right two write paths: **admin seat assignment UI** and **accept-org-invite**.
  - Upsert with `onConflict: 'user_id,course_id'` aligns with your unique constraint.
  ### 🔧 Tighten / correct
  **A) Avoid the extra SELECT after update**  
  Instead of re-querying `rvt_seats` for `course_id`, use the seat row you already have *if it’s available*. If not, your approach works but introduces an extra round trip.
  **B) Ensure** `purchased_at` **is a valid column**  
  You didn’t list `purchased_at` earlier in schema verification. If it doesn’t exist, this upsert will fail. Safer:
  - remove `purchased_at`, or
  - use `created_at` default and store timestamps in `metadata`.
  **C) Ensure entitlement “status” enum supports** `active`**/**`revoked`  
  If `course_entitlements.status` is an enum, confirm it includes `active` and `revoked`. If not, use existing values (`granted/disabled` etc.).
  ### ✅ Critical correction: Unassign flow
  Your unassign snippet queries `assigned_user_id` **after** unsetting the seat. That can return null.
  **Correct approach:**
  - fetch seatData first (course_id + assigned_user_id)
  - then update seat row to unassigned
  - then revoke entitlement using the captured assigned_user_id
  That’s a real bug fix, not a preference.
  ---
  # Fix 2: Module completion → course_completions
  ### ✅ Confirmed good (for first green run)
  You’re right that waiting until certificate issuance to write `course_completions` prevents DB-grounded proof of completion.
  ### 🔧 Tighten / correct
  **A) Don’t write course_completions from client if RLS blocks it**  
  If students are allowed to write `user_progress` but not `course_completions`, your change will silently fail and you’ll still be blocked.
  **Safer minimal approach:**
  - create a small RPC or edge function: `upsert-course-completion`
  - call it from `useUserProgress.tsx` once `completedCount` threshold is met
  That way you control permissions and can log failures.
  **B) Your completion condition**  
  You use `REQUIRED_FOR_EXAM`. Make sure this matches course reality (some courses may have optional modules). If there’s a `course_modules` table with required flags, you’ll want that later — but for green run, your gating logic is acceptable as long as it matches the exam gate.
  ---
  # Fix 3: Certificate pipeline (audit log + verification + pdf_url)
  ### ✅ Confirmed good
  You’re fixing the three core certificate blockers:
  - `user_certificates` missing
  - `certificate_audit_log` empty
  - `pdf_url` null
  ### 🔧 Tighten / correct
  **A) Ensure certificate_audit_log has columns you’re inserting**  
  You listed: `certificate_id, action, actor_id, metadata` and implied `created_at`.  
  Your insert adds `ip_address` and `user_agent`. If those columns don’t exist, insert fails and you’ll still have 0 logs.
  ✅ Recommendation: make this insert conditional:
  - insert only the columns that exist today, or
  - add a migration to add ip/user_agent columns if desired.
  **B) Verification code**  
  Your format is fine. But **make it deterministic enough to avoid collisions**. Add `certificate.id` suffix or use crypto random if available. For first green run, collision risk is low, but still avoidable.
  **C)** `evaluate_and_issue_certificate` **audit insert**  
  Yes — add it via migration. That’s the correct spot because that DB function currently bypasses the edge-function audit.
  **D) Placeholder** `pdf_url`  
  This is okay for “green,” but it must not break UI if UI expects a PDF download.
  Minimum safe behavior:
  - label it as “View Certificate” link, not “Download PDF”
  - or point to a generated PDF route later
  ---
  # Fix 4: Org creation → organization_members row
  ### ✅ Confirmed root cause
  11/12 orgs orphaned, and member_type enum only has `manager`.
  ### ⚠️ Major caution: trigger using auth.uid()
  This is the biggest “double-check” item.
  **Why it’s risky**
  - DB triggers run in a server context; `auth.uid()` often returns null unless the insert is executed through PostgREST with JWT claims properly set.
  - Many orgs were created without a membership row already — which suggests the org creation path may be service-role or server-side inserts where auth.uid() is null.
  ### Safer alternatives (choose one)
  **Option A (best for first green):** Fix in the creating edge function(s)  
  Where org is created (application completion or admin create org), immediately insert `organization_members`.
  **Option B:** Add `created_by uuid` column to organizations
  - Set `created_by` at insert time (app/edge)
  - Trigger uses `NEW.created_by`, not `auth.uid()`
  **Option C:** RPC `create_organization_with_membership(...)`  
  Encapsulate both inserts in one server-side function.
  ✅ If you still want a trigger, you *need* a reliable user id source — `auth.uid()` alone is not.
  Also: your trigger references `organization_members.email` and `organization_members.role`. Confirm those columns exist. If not, simplify the insert to the columns that exist.
  ---
  # Fix 5: Payment traceability enhancement
  ### ✅ Confirmed good
  Logging `user_id` into payment audit is exactly what unlocks traceability.
  ### 🔧 Tighten / correct
  - Ensure you log the same identifier used by seats: `purchase_id` should line up with `payment_id/order_id`.
  - Include `purchase_id` in `rvt_seats` and in `payment_audit_log` so you can join:
    - purchase → seats created → seat assignment.
  If `allocate-seats-on-payment` currently writes to `communication_logs` only, adding `payment_audit_log` insert is correct, but make sure it’s in the **same transactional “success path”** as seat creation.
  ---
  # Two “missing” items to add to your plan (small but important)
  ## 6) Seat assignment must be server-authoritative (even if minimal)
  Right now you’re enhancing UI + invite function. But if there are *any* other paths to assign seats (admin tools, scripts), you’ll still risk assigned seats without entitlements.
  **Minimal patch**  
  Create a single shared server-side function:
  - `assign-seat-and-entitle(user_id, seat_id)`  
  and call it from both UI and `accept-org-invite`.
  Even if it just wraps the two updates, it prevents drift.
  ## 7) Add audit events for entitlement + completion (for timeline completeness)
  You’re adding certificate audit logging, but your unified timeline will still miss:
  - entitlement creation
  - course completion
  For “first green run,” you can log those events into **admin_operations_audit** (since it already feeds unified timeline):
  - `operation_type = 'ENTITLEMENT_GRANTED'`
  - `operation_type = 'COURSE_COMPLETED'`
  This makes your timeline meaningful beyond certificates.
  ---
  # Final “Confirm or Fix” checklist (do this before merging)
  1. Confirm `course_entitlements` has columns: `source`, `status`, `metadata` (and whether `purchased_at` exists)
  2. Confirm status enums support your values (`active`, `revoked`)
  3. Fix unassign ordering bug (capture assigned_user_id before clearing seat)
  4. Confirm `certificate_audit_log` columns support ip/user_agent or remove them
  5. Replace org trigger auth.uid() approach with created_by or edge-function membership insert
  6. Ensure payment audit write includes user_id **and** purchase/order id used by rvt_seats.purchase_id
  7. Add admin_ops audit events for entitlement + completion (optional but improves unified timeline proof)
  ---
  If you want, paste the **current** `organization_members` **columns** (just the table definition or a column list) and the **certificate_audit_log column list**, and I’ll rewrite Fix 4 + Fix 3A as exact SQL/TS patches that cannot fail due to missing columns.