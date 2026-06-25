## Vimeo Orphan Reconciliation — Confirmed Mappings

Apply Louis's confirmed mappings to clear the 2 orphan video assets and unblock 2 of the 6 RVT modules currently missing a `video_url`.

### Confirmed mappings
| Orphan video | Vimeo URL | Target module |
|---|---|---|
| `section_3_inventory` | `https://vimeo.com/1073072073` | Module 4 — Inventory Management and Tracking (`14d0aa9f-4436-460c-a76b-52f07ba33bf3`) |
| `section_15_customer_ed` | `https://vimeo.com/1096138533?h=<hash>` | Module 2 — Patient Rights and Privacy (`3b7d23c0-c7d9-48ea-ac75-17e515e6304a`) |

Module 5 (Customer Service Excellence) is **not** touched — it already has a valid video.

### Changes (data-only, via insert tool)

1. **`video_assets`** — set `module_id` and clear `unmapped_reason`
   - row `069082d4-3325-4960-99f2-e3ea4a0d287c` (section_3_inventory) → `module_id = 14d0aa9f…` , `unmapped_reason = NULL`
   - row `0fd47100-2171-4d29-a9d1-11f49958c428` (section_15_customer_ed) → `module_id = 3b7d23c0…`, `unmapped_reason = NULL`

2. **`course_modules`** — populate `video_url` and clear `unmapped_reason`
   - Module 4 → `video_url = 'https://vimeo.com/1073072073'`, `unmapped_reason = NULL`
   - Module 2 → `video_url = 'https://vimeo.com/1096138533'` (use full Vimeo hash from the `video_assets` row if present), `unmapped_reason = NULL`

3. **Verification queries (read-only)** after the writes:
   - Confirm both `video_assets` rows now have `module_id` set and `unmapped_reason IS NULL`.
   - Confirm both `course_modules` rows now have `video_url` populated.
   - Re-run `count_unmapped_modules()` and `get_launch_readiness()` and report the new `real_unmapped` count (expected to drop by 2; remaining 4 stay classified as `accepted_exclusions` awaiting correct Vimeo IDs).

### Out of scope (explicitly NOT changed)
- Modules 9 (POS), 11 (Cannabis Cultivation), 14 (Age Verification), 19 (Supervising Compliance) — **leave as is**, still flagged `awaiting_correct_vimeo_id_2026-06-17`. These need either net-new Vimeo uploads or a separate confirmed mapping.
- No schema changes, no edge function changes, no UI changes.

### Risk
Zero — purely two-row updates on each of two tables, fully reversible, no auth/payment/edge surface touched. Production GO blockers (Phase 3 PayPal capture, Phase 4 evidence freeze) are unaffected by this change.
