# Video mapping correction — duplicate Vimeo ids unmapped (2026-06-17)

## Context

The `video_inventory_2026-06-10.csv` master inventory surfaced multiple
`course_modules` rows that pointed to the same Vimeo id, despite covering
unrelated subjects. A compliance training platform cannot ship with a
known-wrong video bound to a real module — a green smoke test ("the URL
plays") would still hide the problem because the wrong video plays
without error.

This document records the remediation applied on 2026-06-17.

## Decision strategy (Option B — best-title-match)

For each duplicate group, keep the single module whose title most
closely matches the canonical `video_assets.title` for that Vimeo id;
unmap all other modules in the group by setting `video_url = NULL`.

A NULL `video_url` causes the player to render the existing
"Video coming soon" state, which is safe — students see no content
rather than the wrong content. The correct Vimeo id per unmapped module
must be supplied by the curriculum owner (Louis) and re-populated
in a follow-up.

Option A (blank all duplicates) and Option C (Louis dictates each
assignment) were considered. Option B was chosen and executed.

## Duplicates corrected

### Group 1 — Vimeo `1073072073` ("Section 3: Cannabis Pharmacology and Therapeutics")

| Module id | Module title | Action | Reason |
|---|---|---|---|
| `14d0aa9f-4436-460c-a76b-52f07ba33bf3` | mod 4 "Inventory Management and Tracking" | **Unmap** | Sole consumer but title does not match canonical; safer to blank than keep known-wrong mapping |

### Group 2 — Vimeo `1073072091` ("Section 4: Substance Use and Customer Safety")

| Module id | Module title | Action | Reason |
|---|---|---|---|
| `dbacc5bc-e14c-470a-a0ba-852df2b41220` | mod 8 "Dosage Guidelines and Patient Consultation" | **Keep** | Closest to "Customer Safety" / patient-facing |
| `b49e8150-f795-4d6f-a501-35d5e1f5aacf` | mod 9 "Point of Sale Systems and Transactions" | **Unmap** | Unrelated |
| `b8d16c7f-10e6-40d5-b766-721839038f5e` | mod 14 "Age Verification and ID Checking" | **Unmap** | Unrelated |

### Group 3 — Vimeo `1096134152` ("Section 7: Mastering Record Keeping")

| Module id | Module title | Action | Reason |
|---|---|---|---|
| `3f0bad34-49ef-4ed7-8ade-6785dd35719a` | mod 13 "Handling Cash and Banking" | **Keep** | Banking → record keeping is closest semantic fit |
| `3b7d23c0-c7d9-48ea-ac75-17e515e6304a` | mod 2 "Patient Rights and Privacy" | **Unmap** | Unrelated to record keeping |

### Group 4 — Vimeo `1073072103` ("Section 5: Responsible Vendor Training Program") — *not in CSV; uncovered by uniqueness index*

| Module id | Module title | Action | Reason |
|---|---|---|---|
| `949aee25-1254-4dfe-a22b-e17912670ba7` | mod 3 "Product Knowledge and Safety" | **Keep** | "Safety" matches `video_assets.asset_key = section_5_safety` |
| `f2eaecb3-603b-4f9e-90ea-254f57774b8f` | mod 11 "Cannabis Cultivation Basics" | **Unmap** | Unrelated |

### Group 5 — Vimeo `1096134709` ("Section 9: Mastering Compliance Audits") — *not in CSV; uncovered by uniqueness index*

| Module id | Module title | Action | Reason |
|---|---|---|---|
| `63d100f8-ad66-4c21-a743-b01df46b94df` | mod 20 "Compliance Oversight & Regulatory Reporting" | **Keep** | "Audits → reporting" closer than "supervising operations" |
| `ec62fe97-9a99-4cec-b25c-7ecbedebbd55` | mod 19 "Supervising Compliance Operations" | **Unmap** | Plausible but weaker match |

## Applied SQL

```sql
-- Unmap the six modules above (executed via supabase--insert tool)
UPDATE public.course_modules SET video_url = NULL, updated_at = now()
WHERE id IN (
  '14d0aa9f-4436-460c-a76b-52f07ba33bf3',
  'b49e8150-f795-4d6f-a501-35d5e1f5aacf',
  'b8d16c7f-10e6-40d5-b766-721839038f5e',
  '3b7d23c0-c7d9-48ea-ac75-17e515e6304a',
  'f2eaecb3-603b-4f9e-90ea-254f57774b8f',
  'ec62fe97-9a99-4cec-b25c-7ecbedebbd55'
);

-- Prevent recurrence (migration)
CREATE UNIQUE INDEX IF NOT EXISTS course_modules_video_url_unique_per_course
  ON public.course_modules (course_id, video_url)
  WHERE video_url IS NOT NULL;
```

## After-state verification

```sql
SELECT course_id, video_url, count(*) FROM public.course_modules
WHERE video_url IS NOT NULL
GROUP BY 1,2 HAVING count(*) > 1;
-- → 0 rows
```

## Open items for Louis (curriculum owner)

These six modules now need a correct Vimeo id assigned. Until then they
render "Video coming soon":

1. `14d0aa9f-4436-460c-a76b-52f07ba33bf3` — mod 4 Inventory Management and Tracking
2. `b49e8150-f795-4d6f-a501-35d5e1f5aacf` — mod 9 Point of Sale Systems and Transactions
3. `b8d16c7f-10e6-40d5-b766-721839038f5e` — mod 14 Age Verification and ID Checking
4. `3b7d23c0-c7d9-48ea-ac75-17e515e6304a` — mod 2 Patient Rights and Privacy
5. `f2eaecb3-603b-4f9e-90ea-254f57774b8f` — mod 11 Cannabis Cultivation Basics
6. `ec62fe97-9a99-4cec-b25c-7ecbedebbd55` — mod 19 Supervising Compliance Operations

Additionally:

- `video_assets.section_15_customer_ed` (Vimeo `1096138533`) is an
  orphan — referenced by no `course_modules` row. Decision needed:
  retire, or assign to a module.
- The two "Keep" decisions in groups 4 and 5 above are heuristic. Louis
  should sanity-check them at the call.

## Out of scope for this correction

- `video_assets` table rows were not modified.
- Hardcoded Vimeo iframes in `src/components/TrainingHandbook.tsx` and
  `src/pages/Index.tsx` were not touched — separate migration ticket.
- Welcome-intro Storage MP4 fallback is wired in code; no asset
  uploaded yet (separate ticket).
- The orphan and the two heuristic "Keep" picks are explicitly deferred
  to Louis.
