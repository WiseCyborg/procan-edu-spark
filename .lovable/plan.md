# Option B — Best-title-match duplicate correction

You picked B. I'll keep the one module per duplicate group whose title best matches the `video_assets` canonical title, and unmap the rest. Below are the exact picks I'll make. **Review the "Keep" / "Unmap" column before approving** — these are heuristic picks, not Louis-validated.

## Picks

| Vimeo id | Canonical title (video_assets) | Module (course_modules) | Action | Reason |
|---|---|---|---|---|
| 1073072073 | Section 3: Cannabis Pharmacology and Therapeutics | mod 4 "Inventory Management and Tracking" | **Unmap** | Only consumer, but title doesn't match — leaving it would keep a known-wrong mapping live |
| 1073072091 | Section 4: Substance Use and Customer Safety | mod 8 "Dosage Guidelines and Patient Consultation" | **Keep** | Closest to "Customer Safety" / patient-facing |
| 1073072091 | (same) | mod 9 "Point of Sale Systems and Transactions" | **Unmap** | Unrelated to substance/safety |
| 1073072091 | (same) | mod 14 "Age Verification and ID Checking" | **Unmap** | Unrelated |
| 1096134152 | Section 7: Mastering Record Keeping | mod 13 "Handling Cash and Banking" | **Keep** | Banking → record keeping is the closest semantic fit |
| 1096134152 | (same) | mod 2 "Patient Rights and Privacy" | **Unmap** | Unrelated to record keeping |

Net effect: 4 modules get `video_url = NULL` (player renders the existing "Video coming soon" state); 2 modules keep their current video; 0 modules end up mapped to a video known to be from a different subject.

If any "Keep" pick is wrong, reply with the correction (e.g. "keep mod 14 on 1073072091, unmap mod 8 instead") and I'll adjust before running.

## Execution

1. Single migration:
   ```sql
   UPDATE public.course_modules SET video_url = NULL, updated_at = now()
   WHERE id IN (
     '14d0aa9f-4436-460c-a76b-52f07ba33bf3', -- mod 4 Inventory Management   (1073072073)
     'b49e8150-f795-4d6f-a501-35d5e1f5aacf', -- mod 9 Point of Sale          (1073072091)
     'b8d16c7f-10e6-40d5-b766-721839038f5e', -- mod 14 Age Verification      (1073072091)
     '3b7d23c0-c7d9-48ea-ac75-17e515e6304a'  -- mod 2 Patient Rights         (1096134152)
   );
   ```
2. Add a partial unique index to prevent the same `video_url` from being assigned to two modules in the same course again:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS course_modules_video_url_unique_per_course
     ON public.course_modules (course_id, video_url)
     WHERE video_url IS NOT NULL;
   ```
3. Verification query (run after) — expect zero rows:
   ```sql
   SELECT course_id, video_url, count(*) FROM public.course_modules
   WHERE video_url IS NOT NULL
   GROUP BY 1,2 HAVING count(*) > 1;
   ```
4. Write `docs/audit/2026-07/evidence/video_mapping_correction_2026-06-17.md` with before-state, decisions/heuristic, after-state, and remaining open items:
   - 4 modules now need a real Vimeo id from Louis (mods 4, 9, 14, 2).
   - Orphan `section_15_customer_ed` (Vimeo 1096138533) still needs a module assignment from Louis.
   - Hardcoded iframes in `TrainingHandbook.tsx` / `Index.tsx` still need a separate migration ticket.
   - Welcome-intro Storage MP4 fallback is a separate open ticket (already wired in code, no asset uploaded).

## Out of scope

- Touching `video_assets` rows.
- Reassigning any module to a *new* Vimeo id (that's Option C, not B).
- Backfilling the orphan or removing hardcoded iframes.

## Decision needed

Approve the picks above (or send corrections), and I'll run the migration + write the evidence doc in one turn.
