# SEC-001 — Role Matrix Sweep

Read-only sweep is complete. This plan writes the evidence file. **No role changes.**

**Timestamp:** 2026-06-25 03:38 UTC
**Source:** `public.user_roles` ⋈ `auth.users` ⋈ `public.profiles`
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
- daniellebrooks502@gmail.com (also admin + student)
- uat+manager@test.com (UAT seed)
- uat-greenrun2+manager@procannedu.com (UAT seed)

## Students (16) — all expected
1 real customer (`flamevape@gmail.com` = William's personal student account), 1 E2E synthetic, plus 14 UAT seeds (`uat+*`, `uat-greenrun2+*`, `uat-employee-*`, `uat-manager-*`) and the multi-role overlaps below.

## Duplicate / stacked roles (5 users)
| Email | Roles | Verdict |
|---|---|---|
| daniellebrooks502@gmail.com | admin + dispensary_manager + student | Intentional — Danielle is admin and tests as both manager and student |
| louis@hendrickscompliance.com | admin + student | Intentional — compliance reviewer also enrolled |
| uat+admin@test.com | admin + student | Intentional UAT seed |
| uat+manager@test.com | dispensary_manager + student | Intentional UAT seed |
| uat-greenrun2+manager@procannedu.com | dispensary_manager + student | Intentional UAT seed |

The schema allows `(user_id, role)` UNIQUE — stacking is legitimate, not a duplicate row defect.

## Unexpected elevated roles
**None.** Every admin and manager maps to a known operator or a clearly-tagged UAT seed (`uat+*` / `uat-greenrun2+*`).

## Recommendation: 🟢 PASS — with one optional cleanup
- No unknown admins, no unknown managers.
- Optional pre-launch hygiene (not a blocker): the 3 `uat+*@test.com` accounts and the 5 `uat-greenrun2+*@procannedu.com` accounts can be moved to a non-production environment or have their elevated roles revoked once UAT is closed. Recommend keeping them through go-live week to preserve regression coverage, then revoking in week 1.

## Query used (canonical)
```sql
SELECT ur.user_id, ur.role::text, ur.created_at,
       u.email, u.created_at AS user_created_at, u.last_sign_in_at,
       p.first_name, p.last_name
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.user_id = ur.user_id
ORDER BY ur.role, u.email;

-- Stacked-role detector
SELECT u.email, array_agg(ur.role::text ORDER BY ur.role) AS roles, COUNT(*) AS role_count
FROM public.user_roles ur JOIN auth.users u ON u.id = ur.user_id
GROUP BY u.email HAVING COUNT(*) > 1 ORDER BY role_count DESC;
```

## Build step (one file write)
Write the above as evidence to:
`docs/audit/2026-07/evidence/sec001_role_sweep.md`

No code, schema, or data changes. Approve to write the file.
