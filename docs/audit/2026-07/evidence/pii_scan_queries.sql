-- PII / payment-card column scan
-- Run as service_role in the Supabase SQL editor.
-- Expected: zero rows from every block below.

-- 1. Plaintext password columns
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name ILIKE '%password%' AND column_name NOT ILIKE '%hash%' AND column_name NOT ILIKE '%encrypted%');

-- 2. Card-data columns
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name ILIKE '%card_number%'
    OR column_name ILIKE '%pan'
    OR column_name ILIKE '%cvv%'
    OR column_name ILIKE '%cvc%'
    OR column_name ILIKE '%cardholder%');

-- 3. SSN / national id columns
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name ILIKE '%ssn%' OR column_name ILIKE '%social_security%');

-- 4. Unencrypted PII columns on profiles_private (should be bytea-encrypted only)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles_private'
  AND data_type <> 'bytea'
  AND column_name NOT IN ('user_id','encryption_version','created_at','updated_at');

-- 5. Sample 1 row of profiles_private to confirm bytea storage
SELECT user_id,
       octet_length(phone_encrypted)   AS phone_bytes,
       octet_length(address_encrypted) AS address_bytes,
       encryption_version
FROM public.profiles_private
LIMIT 1;

-- 6. Confirm uniqueness constraints that enforce idempotency
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('orders','payments','course_entitlements','module_attestations','course_completions')
  AND c.contype = 'u';
