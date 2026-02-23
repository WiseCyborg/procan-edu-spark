# Full Enterprise E2E Audit — What's Missing + Build Plan

## Schema Reality Check (Verified Against Live DB)

All 5 audit tables, seat/entitlement tables, progress tables, and certificate tables have been verified. The user's corrected SQL queries are **almost entirely accurate** with a few final column-level corrections noted below.

---

## What Already Exists (No Changes Needed)

1. **RVT System Auditor Panel** (`RVTSystemAuditorPanel.tsx`) -- fully functional, correctly maps to E2E report schema
2. **E2E Validation** (`run-e2e-validation`) -- Journeys A-H including Payment Audit
3. **Compliance Delta** (`generate-compliance-delta`) -- schema-aligned after last fix
4. **Dispensary Application flow** -- `dispensary_applications` table with `application_status`, `registration_token`, `registration_completed`
5. **Role Requests** -- `role_requests` table with `requested_member_type`, `status`, `reviewed_by`
6. **Seat model** -- `rvt_seats` with `purchase_id`, `organization_id`, `assigned_user_id`, `status`
7. **Course entitlements** -- `course_entitlements` with unique constraint on `(user_id, course_id)`
8. **Progress tracking** -- `user_progress` (module-level) + `course_completions` (course-level with `completion_percent`, `passed`)
9. **Certificates** -- `certificates` (has `certificate_number`, `issue_date`, `pdf_url`, `status`) + `user_certificates` (has `verification_code`)

---

## What's Missing: The Unified Audit Timeline View

The user's plan identifies 5 fragmented audit tables. Here are their actual schemas:


| Table                    | Key Columns                                                         | User ID Column        |
| ------------------------ | ------------------------------------------------------------------- | --------------------- |
| `certificate_audit_log`  | certificate_id, action, actor_id, metadata                          | `actor_id`            |
| `security_audit_log`     | user_id, action_type, table_name, record_id, old_values, new_values | `user_id`             |
| `admin_operations_audit` | operation_type, performed_by, target_user_id, target_email, success | `target_user_id`      |
| `payment_audit_log`      | order_id, event_type, event_data                                    | **No user_id column** |
| `api_console_audit`      | user_id, command, api_route, success, error_message                 | `user_id`             |


**Critical finding**: `payment_audit_log` has NO user ID column -- only `order_id` and `event_data` (JSONB). This means payment events cannot be joined into a user timeline without parsing JSON.

### Build: `unified_audit_timeline` SQL View

Create a database view that unions the 4 user-linkable audit tables into one timeline. Payment audit will be included with a note that the user_id must be extracted from `event_data` JSON if available.

```sql
CREATE OR REPLACE VIEW unified_audit_timeline AS
  -- Certificate events
  SELECT 
    id, 
    actor_id AS user_id,
    'certificate' AS audit_source,
    action AS event_type,
    metadata::text AS details,
    created_at
  FROM certificate_audit_log
  
  UNION ALL
  
  -- Security events
  SELECT 
    id,
    user_id,
    'security' AS audit_source,
    action_type AS event_type,
    jsonb_build_object('table', table_name, 'record_id', record_id)::text AS details,
    created_at
  FROM security_audit_log
  
  UNION ALL
  
  -- Admin operations
  SELECT 
    id,
    COALESCE(target_user_id, performed_by) AS user_id,
    'admin_ops' AS audit_source,
    operation_type AS event_type,
    metadata::text AS details,
    created_at
  FROM admin_operations_audit
  
  UNION ALL
  
  -- API console
  SELECT 
    id,
    user_id,
    'api_console' AS audit_source,
    command AS event_type,
    jsonb_build_object('route', api_route, 'success', success, 'error', error_message)::text AS details,
    created_at
  FROM api_console_audit
  
  ORDER BY created_at DESC;
```

---

## SQL Query Corrections for the Audit Plan

The user's plan queries are 95% correct. Here are the specific fixes needed:

### Phase 1 -- `dispensary_applications`

- Uses `contact_email` -- **correct** (column exists)
- Uses `application_status` -- **correct**
- Uses `registration_token` -- **correct**

### Phase 2 -- Payment/Seats

- `payment_audit_log` has no `actor_user_id` column. The query should use `order_id` or extract from `event_data`:

```sql
SELECT id, order_id, event_type, event_data, created_at
FROM payment_audit_log
ORDER BY created_at DESC LIMIT 20;
```

### Phase 3 -- Role Requests

- `role_requests` uses `requested_member_type` (not `requested_role`)
- Status column exists and works as expected

### Phase 7 -- Audit Tables

- `certificate_audit_log` has `actor_id` (not `target_user_id`)
- `payment_audit_log` has no user ID column at all
- `security_audit_log` uses `user_id` (correct)
- `admin_operations_audit` uses `target_user_id` (correct)
- `api_console_audit` uses `user_id` (correct)

---

## Implementation Steps

### Step 1: Create `unified_audit_timeline` View

- SQL migration to create the view unioning the 4 user-linkable audit tables
- Add RLS policy allowing admins to read the view

### Step 2: Add a gap for `payment_audit_log`

- Flag in the audit panel that payment events lack user-level traceability
- This is a known schema gap the team should address later (add `user_id` column to `payment_audit_log`)

### Step 3: No other code changes needed

- The existing RVT System Auditor Panel, E2E validation, and compliance delta are all schema-aligned and functional
- The user's corrected SQL queries (with the minor fixes above) can be run manually as verification steps

---

## Summary


| Item                               | Status                                |
| ---------------------------------- | ------------------------------------- |
| E2E Validation (Journeys A-H)      | Already built and deployed            |
| Compliance Delta                   | Already built, schema-fixed, deployed |
| Auditor Panel UI                   | Already built with PDF/CSV export     |
| Dispensary Application flow        | Exists, queries correct               |
| Role Request + Approval            | Exists, queries correct               |
| Seat allocation model              | Exists, queries correct               |
| Progress tracking tables           | Exist, queries correct                |
| Certificate tables                 | Exist, queries correct                |
| **Unified Audit Timeline**         | **MISSING -- needs SQL view**         |
| **payment_audit_log user linkage** | **MISSING -- known schema gap**       |


The only build action is creating the `unified_audit_timeline` database view so that Phases 7-8 of the audit plan can query a single source of truth for user lifecycle events.  
  
and confirm  
  
Locked in — your reality-check is solid, and the **only true build** is the unified audit timeline **view** (plus RLS). Two important refinements:

1. **You can’t reliably** `ORDER BY` **inside a view** unless you wrap it in a final `SELECT … FROM (…) t ORDER BY …` (and even then, consumers should apply ordering). Best practice: **omit ORDER BY in the view** and order at query-time.
2. Your `admin_operations_audit` union references `metadata`, but in your schema table list you didn’t include it. If `metadata` exists, great. If not, we’ll build details from the columns you confirmed (`operation_type`, `performed_by`, `target_user_id`, `target_email`, `success`).

Below is a **production-safe migration** that matches what you verified and won’t break if payment linkage is missing.

---

## 1) Create the unified view (4 tables + optional payment stub)

### Migration SQL

```sql
-- 001_create_unified_audit_timeline.sql

CREATE OR REPLACE VIEW public.unified_audit_timeline AS
WITH unified AS (

  -- Certificate events
  SELECT
    cal.id::text                               AS event_id,
    cal.actor_id                               AS user_id,
    'certificate'                              AS audit_source,
    cal.action                                 AS event_type,
    cal.metadata                               AS event_data,
    cal.created_at                             AS created_at
  FROM public.certificate_audit_log cal

  UNION ALL

  -- Security events
  SELECT
    sal.id::text                               AS event_id,
    sal.user_id                                AS user_id,
    'security'                                 AS audit_source,
    sal.action_type                            AS event_type,
    jsonb_build_object(
      'table_name', sal.table_name,
      'record_id', sal.record_id,
      'old_values', sal.old_values,
      'new_values', sal.new_values
    )                                          AS event_data,
    sal.created_at                             AS created_at
  FROM public.security_audit_log sal

  UNION ALL

  -- Admin operations
  SELECT
    aoa.id::text                               AS event_id,
    COALESCE(aoa.target_user_id, aoa.performed_by) AS user_id,
    'admin_ops'                                AS audit_source,
    aoa.operation_type                         AS event_type,
    jsonb_build_object(
      'performed_by', aoa.performed_by,
      'target_user_id', aoa.target_user_id,
      'target_email', aoa.target_email,
      'success', aoa.success
    )                                          AS event_data,
    aoa.created_at                             AS created_at
  FROM public.admin_operations_audit aoa

  UNION ALL

  -- API console
  SELECT
    aca.id::text                               AS event_id,
    aca.user_id                                AS user_id,
    'api_console'                              AS audit_source,
    aca.command                                AS event_type,
    jsonb_build_object(
      'api_route', aca.api_route,
      'success', aca.success,
      'error_message', aca.error_message
    )                                          AS event_data,
    aca.created_at                             AS created_at
  FROM public.api_console_audit aca

  /*
  Optional: Payment audit *stub*
  If event_data contains a user_id (or email), you can include it later with a JSON extraction.
  Leaving this out now avoids false joins.
  */

)
SELECT
  event_id,
  user_id,
  audit_source,
  event_type,
  event_data,
  created_at
FROM unified;

```

### Query-time ordering (recommended)

```sql
SELECT *
FROM public.unified_audit_timeline
WHERE user_id = '<AUTH_USER_ID>'
ORDER BY created_at DESC
LIMIT 200;

```

---

## 2) RLS / permissions: safest approach

Views inherit access rules from underlying tables. Since these are audit tables, you typically do **one** of these:

### Option A (preferred): Restrict base tables, grant view only to Admin via a role-claim policy

If you already have an “admin” claim (JWT) or a `user_roles` table, create a policy on each audit table for admins. Then the view just works.

Example policy pattern (adjust to your auth model):

```sql
-- Example: allow admins to read audit tables
-- (replace with your actual admin role check)

CREATE POLICY "Admins can read certificate audit"
ON public.certificate_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

```

Repeat similarly for `security_audit_log`, `admin_operations_audit`, `api_console_audit`.

### Option B: Materialize + lock down (if you don’t want to open base tables)

Create a **materialized view** refreshed by a privileged job, and expose *only that* with RLS. This is heavier but isolates sensitive base logs.

---

## 3) Payment audit gap: do this now vs later

You already nailed it: `payment_audit_log` **is not user-linkable** without parsing JSON.

### Minimal “now” solution (non-breaking)

Add a “helper view” that *attempts* to extract user identity if present:

```sql
CREATE OR REPLACE VIEW public.payment_audit_user_hint AS
SELECT
  id,
  order_id,
  event_type,
  created_at,
  -- Update keys below to match your actual event_data structure
  (event_data->>'user_id')::uuid AS extracted_user_id,
  (event_data->>'email')         AS extracted_email,
  event_data
FROM public.payment_audit_log;

```

Then later, if `extracted_user_id` is consistently populated, you can union it into `unified_audit_timeline`. Until then, keep it separate and treat as “best effort.”

### Correct long-term fix (real schema fix)

Add `user_id uuid null` to `payment_audit_log` and populate it at write-time in the payment edge/webhook.

---

## 4) Update the Lovable audit instructions (two tiny corrections)

Where the plan says “payment audit by actor,” replace with:

```sql
SELECT id, order_id, event_type, event_data, created_at
FROM payment_audit_log
ORDER BY created_at DESC
LIMIT 50;

```

And for unified timeline verification:

```sql
SELECT audit_source, event_type, created_at, event_data
FROM public.unified_audit_timeline
WHERE user_id = '<EMP1_AUTH_USER_ID>'
ORDER BY created_at DESC
LIMIT 200;

```

---

## 5) Acceptance criteria (so we can call it DONE)

✅ `unified_audit_timeline` exists  
✅ Admin can query it in Admin → Operations → Testing context  
✅ For a given Employee user_id, you can see events from at least:

- `security` (login/role-related)
- `api_console` (commands/routes)
- `admin_ops` (approvals, assignments)
- `certificate` (issue/verify actions)  
✅ Payment remains explicitly flagged as “not user-linkable yet”

---

If you want, paste the **actual column list** for `certificate_audit_log` (specifically whether it has `created_at` and `metadata` exactly), and I’ll adjust the view to be 100% column-perfect with zero assumptions.