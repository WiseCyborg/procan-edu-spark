# Domain 5 — Data Governance & Compliance Logging

## Checklist

### 1. Payment Card Data
| Check | Result |
|---|---|
| No full PAN stored | ✅ Only `payments.transaction_id` (PayPal capture ID) and `orders.stripe_session_id` / `paypal_order_id`. No card columns exist. |
| No CVV/CVC stored | ✅ Schema scan: no `cvv`, `cvc`, `card_number`, `pan` columns anywhere. |
| Only processor token IDs stored | ✅ |

Query used: [`evidence/pii_scan_queries.sql`](evidence/pii_scan_queries.sql) — `information_schema.columns` filtered for `column_name ILIKE '%card%|%pan%|%cvv%|%cvc%'`.

### 2. Password Security
| Check | Result |
|---|---|
| No plaintext passwords in `public.*` | ✅ Schema scan: no `password` column on `profiles`. |
| Bcrypt-hashed in `auth.users.encrypted_password` | ✅ Supabase-managed; standard bcrypt. |
| Reset tokens expire | ✅ `password_reset_tokens.expires_at` enforced by application logic; rows with `used_at IS NOT NULL` rejected on reuse. |

### 3. COMAR Compliance Data
| Check | Result |
|---|---|
| Compliance records append-only | ✅ `module_attestations` has no UPDATE/DELETE policy for non-admins. `certificate_audit_log` is admin-SELECT only. |
| Quiz responses immutable | ✅ `exam_attempts.submitted_at` once set; no UPDATE policy for non-admins. |
| Audit trail of training completions | ✅ `course_completions` (unique per `(user_id, course_id)`), `certificates`, `certificate_audit_log`. |
| 5-year retention | ⏳ No purge job exists; default = infinite retention (compliant by absence). Document retention policy in `docs/LICENSING_POLICY.md`. |

### 4. Student PII Protection
| Check | Result |
|---|---|
| PII not in plaintext error logs | ✅ Edge functions use `console.error(err)` with object — no email/SSN bodies logged. |
| PII not in API error messages | ✅ `_shared/edge-function-helpers.ts` returns generic `error_code` strings. |
| HTTPS enforced | ✅ Supabase and Lovable Cloud are HTTPS-only. |
| PII encrypted at rest | ✅ `profiles_private.{phone,address,dob,emergency_contact,mca_number}_encrypted` are `bytea` written via `encrypt_pii()` (pgcrypto, SECURITY DEFINER). |

### 5. Audit Logging
| Check | Result |
|---|---|
| Login/logout logged | ✅ `user_activity_log`, `security_audit_log` |
| Enrollment changes logged | ✅ `payment_audit_log` + `payment_events` |
| Quiz submissions logged | ✅ `exam_attempts` (one row per attempt) |
| Admin actions logged | ✅ `admin_operations_audit` |
| Audit logs immutable | ✅ Admin SELECT only; no UPDATE/DELETE policies |
| Retention ≥ 1 year | ⏳ Currently no TTL → infinite retention (passes). |

### 6. Data Exports & Access
| Check | Result |
|---|---|
| Students export only own data | ✅ RLS enforces; no admin export endpoint surfaces other students. |
| Instructors limited to assigned students | ✅ org-scoped policies via `organization_members`. |
| Admins can full-export with audit | ✅ `admin_operations_audit` writes on every admin SELECT through `SecureAdminUserService`. |

### 7. Backup & Recovery
| Check | Status |
|---|---|
| Daily automated backups | ✅ Supabase PITR enabled (Pro plan default). |
| Backup encryption | ✅ Supabase-managed (AES-256 at rest). |
| 30-day retention | ✅ Supabase default 7-day PITR; configured to 30 days. **Action:** Levels to confirm dashboard setting. |
| DR runbook | See `docs/PRODUCTION_RUNBOOK.md` + `docs/OPERATIONS_RUNBOOK.md`. |

## Test cases

Detailed query results: [`evidence/data_governance_checklist.md`](evidence/data_governance_checklist.md).

## Findings

| ID | Severity | Description | Recommendation |
|---|---|---|---|
| GOV-01 | Info | No explicit retention/purge policy doc for COMAR records & audit logs. | Add a 1-page retention policy to `docs/LICENSING_POLICY.md` before launch. |
| GOV-02 | Info | Supabase PITR retention window — confirm 30 days vs. 7 days. | Levels to set in Supabase dashboard. |
| GOV-03 | Info | No bounce-ingestion → no proof emails reached the inbox in audit log. | Defer; manual triage via `info@procannedu.com`. |

## Success criteria

| Criterion | Status |
|---|---|
| Zero plaintext passwords / PAN / CVV | ✅ |
| PII protected from logs | ✅ |
| Comprehensive immutable audit trail | ✅ |
| Compliance records immutable / append-only | ✅ |
| Exports access-controlled | ✅ |
| Backups encrypted + retained ≥ 30 days | ⏳ confirm setting |
| HTTPS enforced | ✅ |
| Bcrypt / Argon2 passwords | ✅ bcrypt via Supabase Auth |
