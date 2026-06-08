# Fix COMAR banner showing stale "January 2025"

## Root cause

`ai_agent_runs` RLS only allows `admin` role to SELECT. The `COMARBanner` renders on the public homepage `/` for anon/unauthenticated visitors, so the TanStack query returns `null` and the component falls back to the hardcoded `'January 2025'` string. Data is fine (latest successful run: `2026-06-08`).

## Fix

### 1. Database migration

Create a SECURITY DEFINER function that returns only the latest successful COMAR Compliance Monitor run timestamp — no other columns, no PII — and grant EXECUTE to `anon` and `authenticated`.

```sql
CREATE OR REPLACE FUNCTION public.get_last_comar_review()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_at
  FROM public.ai_agent_runs
  WHERE agent_name = 'COMAR Compliance Monitor'
    AND execution_status = 'success'
  ORDER BY created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_last_comar_review() TO anon, authenticated;
```

### 2. Update `src/hooks/useLastComarReview.ts`

Replace the direct `.from('ai_agent_runs')` query with `.rpc('get_last_comar_review')`. Keep everything else (staleTime, `refetchOnMount: 'always'`, `refetchOnWindowFocus`, Realtime subscription, query key).

### Out of scope

- No changes to `COMARBanner.tsx` (fallback string stays as-is for the brief loading flash).
- No changes to the underlying RLS policies on `ai_agent_runs` (admin-only reads remain).
- No edge function or agent changes.

## Verification

1. Reload `/` as anonymous visitor → banner reads **"Last reviewed: June 2026"**.
2. Network tab shows a single `rpc/get_last_comar_review` POST returning the ISO timestamp.
3. After next COMAR Compliance Monitor success, Realtime invalidation refetches and the month auto-advances.
