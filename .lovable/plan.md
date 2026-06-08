## Make `COMARBanner` reflect live review date

### Problem
`src/components/layout/COMARBanner.tsx` line 20 hardcodes **"Last reviewed: January 2025"**. The COMAR Compliance Monitor agent has run successfully 13 times in the last 14 days (most recent today, 2026-06-08 08:00) but none of that is reflected in the banner.

### Fix
Replace the static string with a live timestamp sourced from the latest successful `COMAR Compliance Monitor` run in `ai_agent_runs`.

**Implementation:**
1. New tiny hook `src/hooks/useLastComarReview.ts`:
   - TanStack `useQuery` (key: `['comar-last-review']`, 5-min staleTime per project convention).
   - Query: `select created_at from ai_agent_runs where agent_name = 'COMAR Compliance Monitor' and execution_status = 'success' order by created_at desc limit 1`.
   - Returns `{ lastReviewed: Date | null, isLoading }`.
2. Update `COMARBanner.tsx`:
   - Call the hook.
   - Format with `Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })` → e.g. "June 2026".
   - Fallback to `"January 2025"` only while loading or if null (keeps current copy as a graceful fallback so the UI never looks broken).
   - Optional micro-touch: a small `text-xs text-muted-foreground` "auto-synced" subscript so users understand it's live. (Skip if you'd rather keep the banner identical.)

### Out of scope
- Not changing the `useCOMARVersion` hook or `site_content_metadata` table (could be wired later, but agent-run timestamp is the closest thing to ground truth right now).
- Not touching banner copy itself, only the date suffix.
- No DB migration, no edge-function changes.

### Verification
- Reload `/` (banner appears in shared layout). Confirm text reads "Last reviewed: June 2026".
- Confirm no console errors.

Want the "auto-synced" subscript or keep the line identical to today?