# Video hosting on R2 + regeneration pipeline completion

Two linked workstreams, both constrained by the edge-function slot ceiling. Verified against the repo: `supabase/functions/` contains **187 function directories** (plus `_shared`), `render-video` is Shotstack-dispatch-only with no collector, `jobs-processor` has a `JOB_HANDLERS` registry that throws `No handler for job type: …` on unknown types, and `video_assets` currently has **no R2/migration columns**.

First execution is a pilot: **RVT Module 01 and Module 14 only.**

---

## 1. Slot budget — functions to retire

Verified by searching the whole repo for each name. Every candidate below is referenced only from admin/UAT panels (or nothing), never from a learner path.

| Function | Referenced by | Verdict |
|---|---|---|
| `create-uat-account` | `UATSetupPanel.tsx`, `UATAccountCreator.tsx` | Retire (UAT-only) |
| `seed-uat-dataset` | `UATControls.tsx`, `purge-uat-seed-dataset` | Retire (pair) |
| `purge-uat-seed-dataset` | `UATControls.tsx`, `seed-uat-dataset` | Retire (pair) |
| `reset-uat-account` | `UATAccountManager.tsx` | Retire |
| `create-demo-accounts` | `TestAccountCreator.tsx` | Retire |
| `send-uat-digest` | `UATControlPanel.tsx` | Retire |
| `install-regression-vault-secret` | `UATControls.tsx` | Retire (one-off bootstrap) |
| `batch-regenerate-tokens` | 3 admin panels | Retire — same effect achievable from `resend-manager-registration` per application |
| `run-e2e-validation` | `RVTSystemAuditorPanel`, `E2EValidationReport`, `post-migration-regression` | **Keep** — active launch-gate tooling |
| `post-migration-regression` | `RegressionTab.tsx` | **Keep** — release governance |
| `backfill-certificate-pdfs` | does not exist in repo | n/a |

**8 slots freed.** Retiring a function = delete its directory + `config.toml` entry + remove the admin UI button that calls it (otherwise dead buttons throw). Requires your explicit go-ahead per function; UAT tooling is recoverable from git if needed later.

---

## 2. Existing vs. new functions

Extend (no new slots):
- **`render-video`** — add an `ffmpeg_micro` provider path (preferred over Shotstack), an `action: "collect"` mode (poll + finalize), and the compliance gate.
- **`jobs-processor`** — register the new job types in `JOB_HANDLERS`.
- **`get-video-url`** — return the R2 public URL directly when `storage_path` is an R2 key, instead of signing Supabase Storage.
- **`admin-storage-signed-upload`** — reuse/extend for R2 presign if admin manual upload is still wanted.

Genuinely new (needs 1 slot, from the 8 freed):
- **`video-migrate`** — Workstream A batch mover (Supabase → R2 → DB → delete source) plus a `verify` mode. Not foldable into `render-video` without making that function two unrelated things; it is also deletable once migration finishes, returning the slot.

Net slot change: **-8 +1 = 7 spare.**

---

## 3. Workstream A — migrate `ProCannVideos` (~52 files, ~1.59 GB) to R2

**Schema (one migration).** Add to `video_assets`: `storage_provider text default 'supabase'`, `r2_key text`, `migrated_at timestamptz`, `migration_status text` (`pending|in_progress|done|failed`), `migration_error text`, `legacy_storage_path text`, `legacy_bucket_id text`. `legacy_*` preserves the pre-migration pointer so a bad run is reversible (this is the same rule the encoding runbook already imposes for the Vimeo pointers).

**Key scheme.** `{course_slug}_module_{NN}_{slug}.mp4`, derived from `courses.slug` + module order + `asset_key`. Assets with no module mapping get `unmapped/{asset_key}.mp4` and are reported, not guessed.

**`video-migrate` (action: `migrate`)**, one file per invocation, loop driven by `system_jobs`:
1. Claim row (`migration_status='pending' → 'in_progress'`, guarded update so two workers can't claim the same asset).
2. Snapshot `legacy_storage_path`/`legacy_bucket_id` if null.
3. HEAD R2 for the target key. If present with matching size, skip to step 6 (idempotent/resumable).
4. Stream download from Supabase Storage with the service role.
5. PUT to R2 via the S3 API using SigV4 (`R2_ENDPOINT`, `R2_REGION=auto`, `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`), `Content-Type: video/mp4`. Files over the edge memory ceiling use S3 multipart; the pilot files should be single-PUT.
6. Update `video_assets`: `public_url = {R2_PUBLIC_BASE_URL}/{key}`, `storage_path = key`, `bucket_id = R2_BUCKET`, `storage_provider='r2'`, `r2_key`, `migrated_at`.
7. **Only after** the DB update succeeds and a re-read confirms it: delete the object via the Storage API (`storage.from('ProCannVideos').remove([...])`) — never SQL, the `protect_delete` trigger blocks that.
8. On any failure: `migration_status='failed'` + `migration_error`, source untouched.

**`video-migrate` (action: `verify`)** — for each migrated asset assert: R2 HEAD 200 with non-zero size; `video_assets.public_url` starts with `R2_PUBLIC_BASE_URL`; Supabase object absent. Emits a per-asset pass/fail report; re-runnable any time.

**Cutover order.** Migrate → verify → spot-check playback in the module player → only then make `ProCannVideos` private / empty it. Keep the bucket (empty) until the 31 Aug grace date passes so nothing 404s silently.

Egress note: `R2_PUBLIC_BASE_URL` is currently the `r2.dev` dev URL, which is rate-limited and not meant for production. Plan to move it to a custom domain (e.g. `videos.procannedu.com`) before public traffic; the code only reads the secret, so that is a secret swap.

---

## 4. Workstream B — finish the regeneration pipeline

**Compliance gate (non-bypassable).** Asset selection in `render-video` gains `.eq('review_status','approved')` **and** `reviewed_by is not null` **and** `reviewed_at is not null`. Script and narration generation may run before approval; render may not. The agent prepares assets to the gate and stops.

**Format.** Narration audio + burned-in captions over a branded static background. No timed multi-slide decks — FFmpeg Micro has no `-filter_complex`. `slide_outline` becomes unused for this provider (left in place, not populated).

**FFmpeg Micro recipe** (base `https://api.ffmpeg-micro.com`, `Authorization: Bearer FFMPEG_MICRO_API_KEY`):
1. `POST /v1/upload/presigned-url` for the narration MP3 → `PUT` the bytes to `uploadUrl` → `POST /v1/upload/confirm`. Same three-step for the branded background PNG (uploaded once, reused).
2. `POST /v1/transcribe` on the audio → SRT. Upload the SRT the same way so the transcode can reference it.
3. `POST /v1/transcodes` in advanced-options mode:
   - input 1: background image, looped, duration = `draft_audio_duration_seconds`
   - input 2: narration MP3
   - video filter chain (single `-vf`, no `filter_complex`): `scale=1280:720,subtitles=<srt>:force_style='FontName=Inter,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Alignment=2,MarginV=48'`
   - output: H.264 high, CRF 23, `-maxrate 3M`, 30 fps, AAC 128k 48 kHz stereo, `+faststart`, `-shortest` — matching `docs/VIDEO_ENCODING_RUNBOOK.md`.
4. `GET /v1/transcodes/:id` poll → on `completed`, `GET /v1/transcodes/:id/download`.

**Collector** (`render-video` with `action: "collect"`, or job type `video_render_collect`): poll the transcode; on success stream the MP4 → PUT to R2 under the canonical key → update `video_assets` (`public_url`, `storage_path`, `r2_key`, `render_status='completed'`, `needs_regeneration=false`, `regeneration_reason=null`, `last_regenerated_at=now()`, `review_status=null`, `draft_video_url=null`) → update `content_review_queue` (`goes_live_at`, `completed_at`, `status`) → delete the predecessor R2 object only after the new key verifies. On failure: `render_status='failed'` + `render_error`, job retries via `system_jobs`.

**Job types to register in `jobs-processor.JOB_HANDLERS`** (the missing-registration bug is exactly what produced the earlier dead-letters):
- `video_migrate_asset` → `video-migrate` (`migrate`)
- `video_migrate_verify` → `video-migrate` (`verify`)
- `video_render_dispatch` → `render-video` (`dispatch`)
- `video_render_collect` → `render-video` (`collect`), self-requeues with backoff while the transcode is still running

A registry-completeness check (every distinct `system_jobs.job_type` has a handler key) runs as part of the pilot sign-off.

---

## 5. Pilot — RVT Modules 01 & 14

1. Retire the 8 functions, confirm deploys succeed again.
2. Apply the schema migration.
3. Migrate + verify **only** those two assets; confirm playback from R2 in the module player.
4. Approve the two regenerated scripts by hand (`review_status='approved'`, `reviewed_by`, `reviewed_at`).
5. Run one dispatch + collect end-to-end; confirm caption burn, audio sync, duration, and that `content_review_queue` closes.
6. Only then batch the remaining ~50 files and the other 21 stale videos.

---

## 6. Risks and seams

- **Edge memory/CPU on large files.** The 168 MB legacy MP4 will not fit a naive buffer-in-memory copy. Stream, and use multipart above ~100 MB; if the runtime still trips, that one file gets a manual upload path.
- **Deleting the source too early.** Mitigated by verify-before-delete plus `legacy_storage_path`.
- **`r2.dev` public base.** Rate-limited; treat custom domain as a pre-launch item.
- **FFmpeg Micro semantics unverified.** The exact advanced-options field names and whether SRT must be a URL or an uploaded asset are read from the API at pilot time; if the burn-in path is unavailable, fallback is pre-rendering captions into the background — this is the single largest unknown.
- **Whisper caption accuracy on COMAR terms.** Auto-transcribed captions can misspell citations. Since the narration script is already known text, prefer generating the SRT from `draft_script` timed against the audio and use Whisper only for timing — captions are compliance-visible text and must not fabricate citation numbers.
- **Retiring UAT functions removes admin buttons.** Those panels need their controls removed in the same change or they throw.
- **Storage quota timing.** Grace ends 31 Aug 2026; migration of all ~1.59 GB should complete well before, with the bucket emptied (not just repointed) since quota counts stored bytes.
