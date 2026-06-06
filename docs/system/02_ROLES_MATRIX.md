# 02 — Roles & Permissions Matrix

ProCannEdu enforces authorization in **three independent layers**. A request must satisfy *all* applicable layers.

## Layer 1 — Supabase Auth (identity)

| Principal | Used for |
|-----------|----------|
| `anon` | Unauthenticated visitors (homepage, catalog, verify, public application form) |
| `authenticated` | Any logged-in user |
| `service_role` | Edge functions only — bypasses RLS |

JWT issued by Supabase Auth; signed sessions stored in `localStorage` and synced cross-tab (see `mem://infrastructure/auth/session-hardening-and-tab-sync`).

## Layer 2 — Organization membership (`organization_members.member_type`)

| `member_type` | Meaning |
|---------------|---------|
| `employee` | Standard staff; sees own training only |
| `coordinator` | Training Coordinator; manages org curriculum + reporting |
| `manager` | Dispensary Manager; full org admin, billing, seats |
| `owner` | Org owner; same as manager + can delete org |

A single `auth.uid()` can belong to multiple orgs. The active org is held in `OrganizationContext`.

## Layer 3 — App role (`user_roles.role`, enum `app_role`)

| Role | Purpose |
|------|---------|
| `admin` | Platform admin (ProCannEdu staff) |
| `dispensary_manager` | Mirrors `member_type='manager'` on a dispensary org |
| `training_coordinator` | Mirrors `member_type='coordinator'` |
| `trainer` | Authoring/teaching role |
| `student` | Default learner |
| `consumer` | Free consumer-education learner |
| `mca_inspector` | Maryland Cannabis Administration read-only inspector |

Checked via `has_role(uuid, app_role)` — `SECURITY DEFINER` function used everywhere in RLS to avoid recursion.

## The unifying RPC: `get_access_snapshot`

Frontend never queries these three layers directly. It calls one RPC and uses the result for all UI gating:

```json
{
  "user_id": "uuid",
  "is_admin": true,
  "is_manager": false,
  "is_coordinator": false,
  "is_student": true,
  "active_org_id": "uuid",
  "member_type": "employee",
  "course_access": { "<course_id>": "granted" | "blocked" | "completed" },
  "profile_complete": true,
  "deprovisioned": false
}
```

Wrapped by `AccessProvider` → `useAccess()` → `<RequireAccess>` guard. See `mem://architecture/security/access-snapshot-rpc`.

## Role × capability matrix

| Capability | anon | consumer | student | trainer | coordinator | dispensary_manager | admin | mca_inspector |
|---|---|---|---|---|---|---|---|---|
| Browse catalog `/courses` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Free consumer track | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Verify a certificate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit org application | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Enroll in a paid course | ❌ | ❌ | ✅ (with entitlement) | — | ✅ | ✅ | ✅ | ❌ |
| Take final exam | ❌ | ❌ | ✅ | — | ✅ | ✅ | ✅ | ❌ |
| Receive cert + renewal | ❌ | issuance-only | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/team-management` | ❌ | ❌ | ❌ | ❌ | ✅ (own org) | ✅ (own org) | ✅ (any) | ❌ |
| `/purchase-seats` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Approve/assign seats | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Org compliance reports | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ (read-only) |
| `/admin/*` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Impersonate user | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Run AI fix plans | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| UAT feedback form | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (and `uat_accounts` allowlist) | ❌ |
| Internal chatbot | scoped public Q&A only | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (full) | ✅ |

## Permission flags table: `role_permissions`

Admin-tunable per-role flags (rare overrides). 4 columns. Default-deny.

## Where each layer is enforced

| Layer | DB | Edge fn | Frontend |
|-------|----|---------| -------- |
| Auth | `auth.uid() IS NOT NULL` in RLS | `supabase.auth.getUser()` (server) | `useAuth()` |
| Org membership | `EXISTS (SELECT 1 FROM organization_members ...)` in RLS | service-role queries | `OrganizationContext`, `get_access_snapshot` |
| App role | `has_role(auth.uid(), '...')` in RLS | re-verified server-side | `useAccess()` |

**Memory rule applied:** ignore any client-supplied role; edge functions always re-validate via `supabase.auth.getUser()` and re-query `user_roles`.
