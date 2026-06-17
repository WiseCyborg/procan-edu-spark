# Two threads — answering both

## A. UAT/Production readiness (video pipeline)

Short answer: **not yet — close to it, but with named items still open.**

**Landed this session:**
- 6 cross-subject duplicate Vimeo mappings unmapped
- Partial unique index `course_modules_video_url_unique_per_course` blocks recurrence
- Signed-URL edge function + `SecureVideoPlayer` + `useSignedVideoUrl` shipped
- Evidence written to `docs/audit/2026-07/evidence/video_mapping_correction_2026-06-17.md`

**Still open (must close or formally accept as deferred):**
1. 6 unmapped modules need correct Vimeo ids from Louis (currently render "Video coming soon")
2. 2 heuristic "keep" picks — mod 8 (`1073072091`) and mod 13 (`1096134152`) — need Louis confirmation
3. `welcome-intro` Storage fallback — confirm backfill landed end-to-end
4. Hardcoded Vimeo iframes in `TrainingHandbook.tsx` and `Index.tsx` bypass signed-URL path — migrate or waive
5. Orphan asset `1096138533` ("Section 15: Customer Education") — map, archive, or document
6. Re-run `docs/audit/2026-07/evidence/signed_video_url_tests.md` after the unmaps

**Recommendation:** UAT can start now if items 1, 2, 5 are explicitly logged as "known deferred" with sign-off. Production should wait on items 3 and 4 (real user-blocking issues).

---

## B. i18n Launch Package — pre-build confirmations (Section 2 of your upload)

You uploaded a 3–4 day i18n scope to ship with July 1. Before I plan the build, three confirmations the doc itself asks for:

1. **Profile table is `public.profiles`** in this project (confirmed against the schema). The `preferred_language` column lands there — no new `users` table.
2. **Chatbot guardrail (SEC-01)** — the three localized system prompts will carry the same anti-prompt-leak block. I'll re-run one leak probe per language post-deploy and attach to the evidence pack.
3. **Library: `react-i18next`** as the default unless you say otherwise.

## Proposed sequencing across both threads

```text
Now      Decide path on video items 1/2/5 (accept-deferred vs. wait on Louis)
Now      Confirm i18n items above (or correct them)
Day 1-2  i18n schema + provider + header selector + en.json full coverage
Day 2-3  es.json + zh.json (machine draft for low-risk; manual for the 40-60 high-visibility)
Day 3    Chatbot prompt routing + 3 localized prompts with SEC-01 guardrail intact
Day 4    Run 9-test evidence pack; Louis QA pass on ES/ZH; leak probes
Parallel Close video items 3 (welcome-intro), 4 (hardcoded iframes) before prod cutover
Prod     Promote when video items 3+4 closed and i18n acceptance criteria met
```

## What I need from you to proceed

- **Video:** "accept items 1/2/5 as deferred, proceed to UAT" — or — "wait until Louis confirms"?
- **i18n:** confirm the 3 items above (profiles table / SEC-01 carry-over / react-i18next) so I can issue the build plan.

Once you answer, I'll issue the concrete build plan for i18n and the punch-list migration for the remaining video items.
