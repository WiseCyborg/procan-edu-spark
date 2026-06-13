# Data Governance Checklist — Evidence

Run [`pii_scan_queries.sql`](pii_scan_queries.sql) and paste results here. All numbered blocks must return **zero rows** except block 5 (sample) and block 6 (unique constraints, which lists the enforced ones).

## Expected unique constraints (from block 6)

| Table | Constraint | Purpose |
|---|---|---|
| `orders` | `orders_stripe_session_id_key` | One order per checkout session |
| `payments` | `payments_transaction_id_key` | Webhook idempotency |
| `course_entitlements` | `course_entitlements_user_id_course_id_key` | No duplicate enrollments |
| `module_attestations` | `module_attestations_user_id_module_id_key` | One attestation per module |
| `course_completions` | `course_completions_user_course_unique` | One completion per course (project memory) |

## Spot-check queries

```sql
-- 1. Any column named 'password' that isn't a hash?
-- Expect: zero rows
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND column_name ILIKE '%password%'
  AND column_name NOT ILIKE '%hash%' AND column_name NOT ILIKE '%encrypted%';

-- 2. profiles_private columns must be bytea (encrypted) except metadata
-- Expect: zero rows
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles_private'
  AND data_type <> 'bytea'
  AND column_name NOT IN ('user_id','encryption_version','created_at','updated_at');

-- 3. Audit logs are immutable — confirm absence of UPDATE/DELETE policies
-- Expect: zero rows
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('admin_operations_audit','certificate_audit_log','payment_audit_log','security_audit_log')
  AND cmd IN ('UPDATE','DELETE');

-- 4. module_attestations append-only — same check
SELECT policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename='module_attestations' AND cmd IN ('UPDATE','DELETE');
```

Paste outputs here before sign-off.
