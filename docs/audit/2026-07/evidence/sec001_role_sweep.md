# SEC-001 — Role Matrix Sweep

**Timestamp:** 2026-06-25 03:38 UTC
**Source:** `public.user_roles` ⋈ `auth.users` ⋈ `public.profiles`
**Mode:** Read-only. No roles changed.
**Total role rows:** 23 across 18 distinct users

## Role distribution

| Role | Rows |
|---|---|
| admin | 4 |
| dispensary_manager | 3 |
| student | 16 |

## Admins (4) — all expected

| Email | Name | Granted | Last sign-in |
|---|---|---|---|
| wisecyborg@gmail.com | William Cunningham Jr (owner) | 2025-08-30 | 2026-02-01 |
| louis@hendrickscompliance.com | Louis Hendricks (compliance) | 2025-12-04 | 2026-01-25 |
| daniellebrooks502@gmail.com | Danielle Brooks | 2026-06-11 | 2026-01-03 |
| uat+admin@test.com | UAT Admin (seed) | 2026-06-06 | 2026-06-06 |

## Dispensary managers (3) — all expected

| Email | Name | Granted | Last sign-in |
|---|---|---|---|
| daniellebrooks502@gmail.com | Danielle Brooks (also admin + student) | 2026-01-03 | 2026-01-03 |
| uat+manager@test.com | UAT Manager (seed) | 2026-06-06 | 2026-06-13 |
| uat-greenrun2+manager@procannedu.com | Test Manager (UAT seed) | 2026-02-23 | — |

## Students / learners (16)

Real / personal accounts:
- `flamevape@gmail.com` — William Cunningham Jr personal student account
- `daniellebrooks502@gmail.com` — also admin + manager (intentional stacking)
- `louis@hendrickscompliance.com` — also admin (intentional stacking)

Synthetic / UAT seeds:
- `e2e+9aab986c@procannedu.com` (E2E regression)
- `uat+admin@test.com`, `uat+employee@test.com`, `uat+manager@test.com`, `uat+student@test.com`
- `uat-employee-022532@test.com`, `uat-manager-064191@test.com`
- `uat-greenrun2+manager@procannedu.com`, `uat-greenrun2+emp1…emp5@procannedu.com`

## Stacked (multi-role) users (5) — all intentional

| Email | Roles | Verdict |
|---|---|---|
| daniellebrooks502@gmail.com | admin + dispensary_manager + student | Intentional — admin who also tests both downstream roles |
| louis@hendrickscompliance.com | admin + student | Intentional — compliance reviewer also enrolled |
| uat+admin@test.com | admin + student | Intentional UAT seed |
| uat+manager@test.com | dispensary_manager + student | Intentional UAT seed |
| uat-greenrun2+manager@procannedu.com | dispensary_manager + student | Intentional UAT seed |

The `user_roles` table enforces `UNIQUE(user_id, role)`. No duplicate `(user_id, role)` pairs exist — stacked roles are legitimate, not a defect.

## Unexpected elevated roles

**None.** Every admin and every dispensary_manager maps to either a known human operator (William, Louis, Danielle) or a clearly-tagged UAT seed (`uat+*` / `uat-greenrun2+*`).

## Recommendation: 🟢 PASS

- No unknown admins.
- No unknown managers.
- No duplicate-row defects.
- No anomalous role grants in the audit window.

### Optional pre-launch hygiene (not a blocker)

The 3 `uat+*@test.com` accounts and the 6 `uat-greenrun2+*@procannedu.com` accounts hold elevated roles in production. Recommend:

1. **Keep them through go-live week** — they preserve regression coverage for the launch-day smoke matrix.
2. **In week 1 post-launch**, revoke their `admin` / `dispensary_manager` rows (leaving `student` for non-destructive regression) or move them to a separate UAT environment.

## Queries used (canonical, reproducible)

```sql
-- 1. Full role roster
SELECT ur.user_id, ur.role::text, ur.created_at,
       u.email, u.created_at AS user_created_at, u.last_sign_in_at,
       p.first_name, p.last_name
FROM public.user_roles ur
JOIN auth.users u            ON u.id = ur.user_id
LEFT JOIN public.profiles p  ON p.user_id = ur.user_id
ORDER BY ur.role, u.email;

-- 2. Role distribution
SELECT role, COUNT(*) FROM public.user_roles GROUP BY role ORDER BY role;

-- 3. Stacked-role detector
SELECT u.email,
       array_agg(ur.role::text ORDER BY ur.role) AS roles,
       COUNT(*) AS role_count
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
GROUP BY u.email
HAVING COUNT(*) > 1
ORDER BY role_count DESC, u.email;
```

---

**Gate status:** SEC-001 closed 🟢. Proceed to Gate 4 (live PayPal capture) and the evidence freeze / build tag.
