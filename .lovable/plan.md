# First Green Run + UAT Readiness Plan

## Phase 1: Stop the Recurring 401 (Quick Win)

The LiveActivityTicker makes a profiles query every 30 seconds that always returns 401 for unauthenticated homepage visitors. The profiles RLS is correct (no anon access), so the fix is to skip the profiles lookup entirely and use static fallback messages.

### Change in `src/components/LiveActivityTicker.tsx`

- Remove the profiles query (lines 31-46)
- Always use fallback: "Someone from Maryland just earned their certificate!"
- This eliminates the recurring 401 without weakening RLS
- Logged-in users don't need personalized ticker data either -- it's social proof, not a data feature

---

## Phase 2: First Green Run DB Proofs

Run these 6 verification queries to confirm the pipeline is operational. No code changes needed -- just DB reads to validate what exists.

### Proof 1: Organizations + Members

```sql
SELECT o.name, om.user_id, om.role, om.status
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
LIMIT 10;
```

### Proof 2: Seats with purchase linkage

```sql
SELECT id, organization_id, status, assigned_user_id, course_id, purchase_id
FROM rvt_seats
ORDER BY updated_at DESC LIMIT 10;
```

### Proof 3: Entitlements exist and are active

```sql
SELECT user_id, course_id, source, status, created_at
FROM course_entitlements
ORDER BY created_at DESC LIMIT 10;
```

### Proof 4: User progress rows

```sql
SELECT user_id, module_id, is_completed, score
FROM user_progress
ORDER BY updated_at DESC LIMIT 10;
```

### Proof 5: Course completions

```sql
SELECT user_id, course_id, completion_percent, passed, completed_at
FROM course_completions
ORDER BY completed_at DESC NULLS LAST LIMIT 10;
```

### Proof 6: Certificate pipeline

```sql
SELECT certificate_number, pdf_url, status FROM certificates ORDER BY issue_date DESC LIMIT 5;
SELECT verification_code, status FROM user_certificates ORDER BY created_at DESC LIMIT 5;
SELECT action, actor_id FROM certificate_audit_log ORDER BY created_at DESC LIMIT 5;
SELECT audit_source, event_type FROM unified_audit_timeline ORDER BY created_at DESC LIMIT 20;
```

These queries will be run as read-only checks -- no code or schema changes.

---

## Phase 3: UAT Seed Data (if tables are empty)

If the proof queries return empty results, the flows haven't been exercised yet. The next step would be to either:

- Exercise the flows through the UI manually, OR
- Use the existing admin tools (TestAccountCreator, PipelineTestHarness) to create seed data

This is a decision point -- no code changes until we see what the proofs return.

---

## Summary


| Step                                          | Type                   | Blocking?          |
| --------------------------------------------- | ---------------------- | ------------------ |
| Remove profiles query from LiveActivityTicker | Code change            | No (cleanup)       |
| Run 6 DB proof queries                        | Read-only verification | Yes (gates UAT)    |
| Seed UAT data if needed                       | Decision after proofs  | Depends on results |


Only one file changes: `src/components/LiveActivityTicker.tsx` (remove the profiles fetch, keep static fallback).  
  
You’re exactly right about the security posture: **401 on profiles for anon is correct**, and the *right* fix is to **stop making the request** when the session is anon. We can keep the two-step architecture for authenticated users if you ever want it later, but for your stated goal (“social proof, not a data feature”), the cleanest move is: **no profiles lookup at all** (or at least **gate it behind auth**).

Below are two safe options. Pick A if you want the absolute simplest “no noise ever.” Pick B if you want “no noise for anon, but still show names when logged in.”

---

# Phase 1 — LiveActivityTicker: Remove recurring 401

## Option A (recommended): Never query profiles (always fallback message)

This matches your plan exactly.

### Minimal patch inside `queryFn`

- Remove `userIds/profileMap/profiles` entirely
- Build messages without profile info

```ts
queryFn: async () => {
  try {
    const { data: exams, error: examsError } = await supabase
      .from('exam_attempts')
      .select('user_id, created_at, is_passed')
      .eq('is_passed', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (examsError) throw examsError;
    if (!exams || exams.length === 0) return [];

    const recentActivities: Activity[] = exams.map((exam: any) => ({
      type: 'certificate' as const,
      message: `Someone from Maryland just earned their certificate! 🎉`,
      timestamp: exam.created_at,
      icon: Trophy,
    }));

    return recentActivities;
  } catch (error) {
    console.warn('LiveActivityTicker: failed to load activities', error);
    return [];
  }
},

```

✅ Result: **exam_attempts 200**, **no profiles call**, **no 401 noise**, UI unchanged.

---

## Option B: Skip profiles lookup only when anon (still shows names when authenticated)

If you’d like the “best of both” with no noise:

```ts
// BEFORE profiles lookup:
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  // anon user: skip profiles query entirely
  return exams.map((exam: any) => ({
    type: 'certificate' as const,
    message: `Someone from Maryland just earned their certificate! 🎉`,
    timestamp: exam.created_at,
    icon: Trophy,
  }));
}

// else: do profiles lookup (your current two-step approach)

```

✅ Result: **0 recurring 401s** for marketing homepage visitors, but you keep personalization for logged-in users.

---

# Phase 2 — First Green Run DB Proofs (tighten two queries)

Your proof queries are good. Two small edits make them more diagnostic:

### Proof 1: Orgs + members (include member_type)

```sql
SELECT o.id, o.name, om.user_id, om.member_type, om.role, om.status, om.created_at
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
ORDER BY om.created_at DESC
LIMIT 20;

```

### Proof 6: Unified timeline (filter for certificate signal)

```sql
SELECT audit_source, event_type, created_at
FROM unified_audit_timeline
WHERE audit_source = 'certificate'
ORDER BY created_at DESC
LIMIT 20;

```

If this returns rows, you’ve proven the certificate audit log path is alive.

---

# Phase 3 — Seed UAT for Louis + Danielle (what to do next)

After you run proofs:

## If tables are **not empty** (you already have real writes)

✅ Proceed straight to UAT scripts.

## If tables are **empty**

Do **one internal First Green Run** through UI (preferred), *or* use your internal tools:

- **TestAccountCreator**: create Manager/Coordinator/Employees
- **PipelineTestHarness**: create org + seed seats + assign + simulate completions (only if it writes canonical tables)

Goal is one full dataset in DB that Louis/Danielle can validate without touching payment.

---

# Deliverables to start True UAT this week

## 1) UAT Seed Package

- 1 org (UAT org)
- 3 seats (2 employees + 1 spare)
- 1 employee fully completed + certificate issued

## 2) Two UAT scripts (short)

### Danielle (business/compliance)

- onboarding, module UX, completion UX, certificate page, verification page

### Louis (audit/compliance)

- verify DB proof artifacts exist + export + unified timeline events

## 3) UAT issue template

- Step, expected, actual, screenshot, user/email, timestamp, blocker severity

---

## Do you want Option A or Option B for the ticker?

If you’re optimizing for “marketing-only / zero noise,” **Option A**.  
If you want “nice-to-have personalization for logged-in users,” **Option B**.

Either way, once that’s committed, the next immediate move is: **run the 6 DB proofs and paste the row counts**—then we’ll decide whether to seed via UI or tools and I’ll generate the UAT scripts.