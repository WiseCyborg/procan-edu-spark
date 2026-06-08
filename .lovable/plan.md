## Auto-refresh COMAR banner

Two-layer freshness on `useLastComarReview`:

### 1. On page load
Already covered — TanStack `useQuery` refetches on mount when cache is stale. Tighten so every fresh mount triggers a refetch regardless of cache:
- Add `refetchOnMount: 'always'` and `refetchOnWindowFocus: true`.
- Keep `staleTime: 5 * 60 * 1000` so we don't hammer the DB while a tab stays open.

### 2. After each successful agent run
Add a Realtime subscription inside the hook:
- `supabase.channel('comar-review-runs')` subscribed to `postgres_changes` on `public.ai_agent_runs`, event `INSERT`, filter `agent_name=eq.COMAR Compliance Monitor`.
- On any matching row where `execution_status === 'success'`, call `queryClient.invalidateQueries({ queryKey: ['comar-last-review'] })`.
- Clean up channel on unmount (`supabase.removeChannel`).

### Files
- Edit only `src/hooks/useLastComarReview.ts`. No other files touched.

### Out of scope
- No DB migration. `ai_agent_runs` Realtime publication: if INSERTs aren't broadcast yet, the on-mount + window-focus refetch still keeps the banner fresh within a few minutes. Will note this in chat if a follow-up DB enablement is needed.
- No changes to `COMARBanner.tsx`, agents, or edge functions.

### Verification
- Reload `/` → banner refetches (Network: one `ai_agent_runs` request).
- Switch tabs away/back → refetch fires.
- After the COMAR Compliance Monitor agent next succeeds, banner updates without reload (if Realtime publication is enabled for `ai_agent_runs`).