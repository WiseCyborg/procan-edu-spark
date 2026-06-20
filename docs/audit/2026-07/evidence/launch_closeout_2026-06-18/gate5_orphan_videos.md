# Gate 5 — Orphan Video Assets

**Initial state:** 4 rows in `video_assets` with `module_id IS NULL`.
**Action:** added `video_assets.unmapped_reason TEXT` column (mirrors `course_modules` pattern) and tagged each orphan with an accepted-exclusion reason.

## Disposition table

| asset_key | id (short) | storage_path | disposition | unmapped_reason |
|---|---|---|---|---|
| `orientation_video` | 8b929760 | `ProCannVideos/ProCann Orientation Video.mp4` | Accepted exclusion — shared welcome asset used outside the module sequence | `storage_hosted_orientation_shared_asset` |
| `welcome-intro` | 46e1794d | `vimeo/1096146284?h=e90b8e5dfc` | Accepted exclusion — shared marketing/welcome page asset, not bound to a module | `welcome_intro_shared_asset_2026-06-08` |
| `section_3_inventory` | 069082d4 | `vimeo/1073072073` | Pending remap to correct RVT course module — kept active for short-term reference, documented exclusion | `rvt_section_video_pending_module_remap_2026-06-18` |
| `section_15_customer_ed` | 0fd47100 | `vimeo/1096138533` | Pending remap to correct RVT course module — kept active for short-term reference, documented exclusion | `rvt_section_video_pending_module_remap_2026-06-18` |

## Verification

```sql
SELECT count(*) FROM video_assets
 WHERE module_id IS NULL AND unmapped_reason IS NULL;  -- 0

SELECT count(*) FROM video_assets WHERE module_id IS NULL;  -- 4 (all tagged)
```

## Follow-up (out of scope, tracked separately)

The two RVT section videos (`section_3_inventory`, `section_15_customer_ed`) should be linked to the corresponding `course_modules` rows in the RVT course catalog once the module-side mapping audit is finalized. They are documented exclusions today, not silent orphans.

**Exit criteria:** 0 unexplained orphan video assets. ✅
