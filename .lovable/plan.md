# Fix LiveActivityTicker 400 Error

## Problem

The `LiveActivityTicker` component on the homepage fires a Supabase query every 30 seconds that uses a PostgREST relationship join (`profiles:user_id`), but `exam_attempts.user_id` has no foreign key to `profiles`. This causes a 400 error on every request, polluting network logs.

## Fix

Remove the broken join. Instead, query `exam_attempts` for just `created_at` and `is_passed`, then do a separate lookup to `profiles` for the matched `user_id` values. This avoids the FK relationship requirement entirely.

## Technical Details

In `src/components/LiveActivityTicker.tsx`:

1. Change the `exam_attempts` select to only fetch its own columns: `created_at, is_passed, user_id`
2. After getting results, fetch profiles separately: `supabase.from('profiles').select('user_id, first_name, county').in('user_id', userIds)`
3. Join the data in JavaScript to build the activity messages

This is a single-file change with no schema or migration needed.  
  
confirm with   
  
Got it. Here’s the clean, **single-file** fix that removes the broken PostgREST relationship join and replaces it with a two-step lookup + JS merge (no schema changes).

## Patch: `src/components/LiveActivityTicker.tsx`

### What changes

- **Stop** doing `profiles:user_id(...)` inside the `exam_attempts` query
- **Do**:
  1. Fetch recent `exam_attempts` with `user_id, created_at, is_passed`
  2. Fetch `profiles` for those `user_id`s
  3. Merge into activity items in JS

### Drop-in replacement pattern

Replace your current fetch logic with something like this (keep your existing UI rendering; this just fixes the data load):

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client"; // adjust if your path differs

type ExamAttemptRow = {
  user_id: string;
  created_at: string;
  is_passed: boolean | null;
};

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  county: string | null;
};

type ActivityItem = {
  created_at: string;
  is_passed: boolean | null;
  user_id: string;
  first_name?: string | null;
  county?: string | null;
};

export default function LiveActivityTicker() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // prevent overlapping polls if a request is slow
  const inFlight = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (inFlight.current) return;
      inFlight.current = true;

      try {
        setError(null);

        // 1) Fetch recent exam attempts (no relationship join)
        const { data: attempts, error: attemptsError } = await supabase
          .from("exam_attempts")
          .select("user_id, created_at, is_passed")
          .order("created_at", { ascending: false })
          .limit(10);

        if (attemptsError) throw attemptsError;

        const attemptRows = (attempts ?? []) as ExamAttemptRow[];

        // If nothing returned, just clear the feed
        if (!attemptRows.length) {
          if (isMounted) setItems([]);
          return;
        }

        // 2) Fetch profiles for the matched user_ids
        const userIds = Array.from(
          new Set(attemptRows.map((a) => a.user_id).filter(Boolean))
        );

        let profileMap = new Map<string, ProfileRow>();

        if (userIds.length) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("user_id, first_name, county")
            .in("user_id", userIds);

          if (profilesError) {
            // Non-fatal: we can still show activity without names
            console.warn("LiveActivityTicker profiles lookup failed:", profilesError);
          } else {
            (profiles ?? []).forEach((p: any) => {
              profileMap.set(p.user_id, {
                user_id: p.user_id,
                first_name: p.first_name ?? null,
                county: p.county ?? null,
              });
            });
          }
        }

        // 3) Merge into UI items
        const merged: ActivityItem[] = attemptRows.map((a) => {
          const p = profileMap.get(a.user_id);
          return {
            user_id: a.user_id,
            created_at: a.created_at,
            is_passed: a.is_passed,
            first_name: p?.first_name ?? null,
            county: p?.county ?? null,
          };
        });

        if (isMounted) setItems(merged);
      } catch (e: any) {
        console.error("LiveActivityTicker load failed:", e);
        if (isMounted) setError(e?.message ?? "Failed to load activity");
      } finally {
        inFlight.current = false;
      }
    };

    // initial load + 30s poll
    load();
    const id = window.setInterval(load, 30_000);

    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, []);

  // Your existing render logic can keep using `items`
  // Example message build (adjust to match your current UI)
  const messages = useMemo(() => {
    return items.map((it) => {
      const name = it.first_name ? it.first_name : "A user";
      const location = it.county ? ` in ${it.county} County` : "";
      const outcome =
        it.is_passed === true ? "passed the exam" : it.is_passed === false ? "attempted the exam" : "submitted an exam attempt";
      return `${name}${location} ${outcome}`;
    });
  }, [items]);

  return (
    <div>
      {/* keep your ticker UI here; this is minimal */}
      {error ? (
        <div className="text-sm text-red-600">Activity unavailable</div>
      ) : (
        <div className="text-sm">
          {messages.length ? messages.join(" • ") : "No recent activity yet"}
        </div>
      )}
    </div>
  );
}

```

### Notes (so it doesn’t regress)

- This removes the FK dependency entirely — no more 400s from PostgREST relationship inference.
- The profiles lookup is **non-fatal** (ticker still works if profiles query is blocked by RLS).
- The `inFlight` guard prevents overlapping polls if the network is slow.

---

## Optional (even better): single query via a DB view later

If you ever want it back to one call without FK constraints, create a SQL view that joins `exam_attempts.user_id = profiles.user_id`. But your requested fix is correct and fastest.

If you paste your current `LiveActivityTicker.tsx`, I can give you an exact minimal diff (only touching the fetch section, keeping your UI markup 100% unchanged).