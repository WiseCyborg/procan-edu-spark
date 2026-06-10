# Video Inventory Export + Vimeo Migration Plan

## Part A — CSV Export (immediate, on build-mode approval)

Write `/mnt/documents/video_inventory_2026-06-10.csv` with one row per video reference across the platform. Columns:

| source | ref | title | access_level | storage_path | url | size_bytes |
|---|---|---|---|---|---|---|

Sources unioned:
- `video_assets` (19 active rows)
- `course_modules.video_url` (24 rows)
- `storage.objects` filtered to video MIME / extension (2 files)
- Hardcoded frontend refs: `src/pages/Index.tsx` (1), `src/pages/TrainingHandbook.tsx` (5)

Surfaced via `<presentation-artifact>` so you can download directly.

---

## Part B — Friday Vimeo → Private `training-videos` Migration

### Goal
Move all ~20 Vimeo-hosted RVT videos into the private Supabase `training-videos` bucket, served via short-lived signed URLs minted by the already-built `get-video-url` edge function. Kill the public `ProCannVideos` bucket (egress hog) once parity is verified.

### Prerequisites (Friday, after spend-cap upgrade)
1. Spend cap raised / Pro plan active.
2. Deploy `get-video-url` edge function.
3. Bucket `training-videos` auto-created on first signed-URL call (already coded).

### Phase 1 — Source acquisition (manual, ~1 hr)
Download originals from Vimeo admin for the 20 unique IDs below. The Vimeo `?h=` hash is the privacy token — not needed once we host ourselves.

```text
1073070281  Section 1: Legal and Regulatory Foundations
1073072061  Section 2: Operational and Safety Procedures
1073072073  Section 3: Cannabis Pharmacology and Therapeutics
1073072091  Section 4: Substance Use and Customer Safety
1073072103  Section 5: Responsible Vendor Training Program
1096133759  Section 6: Health Considerations
1096134152  Section 7: Mastering Record Keeping
1096134435  Section 8: Mastering Dispensary Security
1096134709  Section 9: Compliance Oversight (also: Supervising Compliance)
1096135200  Section 10: Cannabis Packaging Laws
1096135626  Section 11: Cannabis Labeling Standards
1096136076  Section 12: Cannabis Transport Rules
1096136520  Section 13: Cannabis Waste Management
1096137849  Section 14: Cannabis Product Testing
1096138533  Section 15: Customer Education
1096140061  Section 16/17: Staff Training / Customer Service
1096142296  Section 16: Emergency Procedures
1096145464  Section 18: Ethical Practices
1096146284  Welcome / Index hero video
+ existing 168 MB "Health Considerations" MP4 already in ProCannVideos (re-encode candidate)
```

### Phase 2 — Re-encode (batch, ~2 hrs CPU)
Apply `docs/VIDEO_ENCODING_RUNBOOK.md` targets per file: H.264, ~1.5 Mbps, 1080p max, AAC 128k, faststart. Naming convention matches `video_assets.storage_path` already in DB:

```text
training-videos/section_1_laws.mp4
training-videos/section_2_sops.mp4
...
training-videos/orientation_video.mp4
training-videos/welcome_intro.mp4   ← new asset_key for Index hero
```

### Phase 3 — Upload + DB rewire (one migration + one data update)

1. **Data update** (insert tool, not migration): for each of the 19 `video_assets` rows currently pointing at `vimeo/<id>`, set:
   - `storage_path = '<asset_key>.mp4'`
   - `public_url = NULL`
   - `bucket_id = 'training-videos'`
2. **New row**: insert `welcome_intro` asset_key (access_level=`public` or `authenticated`) for the Index hero video.
3. **course_modules cleanup**: rewrite all 23 `course_modules.video_url` Vimeo links to point at an `asset_key://` scheme (or join via new `video_asset_id` FK) so the player resolves through `get-video-url` instead of embedding Vimeo directly. Pick one in build-mode kickoff:
   - **Option 3a** (lighter): keep `video_url` as a string but use scheme `asset:section_1_laws`; player branches on prefix.
   - **Option 3b** (cleaner): add `course_modules.video_asset_id uuid references video_assets(id)`, backfill, deprecate `video_url`.

### Phase 4 — Frontend rewire
- `src/pages/Index.tsx`: replace hardcoded `WelcomeVideoSection videoUrl="https://vimeo.com/..."` with `<SecureVideoPlayer assetKey="welcome_intro" />`.
- `src/pages/TrainingHandbook.tsx`: replace 5 hardcoded Vimeo iframes with `<SecureVideoPlayer assetKey="section_N_*" />`.
- `src/components/course/VimeoPlayer.tsx` + `VideoPlayer.tsx` + `SCORMStylePlayer.tsx`: keep Vimeo branch as legacy fallback for one release, then delete.

### Phase 5 — Cutover verification
- Admin Video Library (`/admin/video-library`) shows all 20 rows = "Ready (X.X MB)".
- Smoke-test 3 modules across 3 courses as an enrolled user.
- Confirm signed URLs expire after 10 min.
- Run egress query: 7-day rolling bytes from `ProCannVideos` trends to zero.

### Phase 6 — Decommission
- Delete the 168 MB orphan MP4 from `ProCannVideos`.
- Delete `ProCannVideos` bucket entirely (or set `public=false` first, monitor 24h, then drop).
- Remove Vimeo legacy code paths.

### Risks & mitigations
| Risk | Mitigation |
|---|---|
| Re-encoded video > Vimeo quality | Spot-check 2 sections at 1080p before batch encode |
| Signed-URL TTL expires mid-playback on long videos | Already 10 min; bump to 3600s if any video > 8 min |
| Module-to-asset mapping ambiguous (Vimeo ID `1073072091` reused 3x in course_modules) | Resolve during Phase 3 — likely all map to `section_4_sales` |
| ProCannVideos still referenced by external links / emails | grep `email-templates/` and external partners before bucket delete |

### Estimated effort
- Phases 1–2: ~3 hrs human time (download + re-encode).
- Phases 3–4: ~2 hrs build-mode work.
- Phases 5–6: ~1 hr verification + cleanup.

### Not in scope
- Captions/VTT generation (defer to follow-up).
- LiveKit recordings (separate system).
- Avatar/agent video (separate system).
