
-- Gate 3: seed comar_versions with active COMAR 14.17.05
INSERT INTO public.comar_versions (version_number, section_reference, effective_date, content, change_summary)
VALUES (
  '14.17.05',
  'COMAR 14.17.05',
  '2025-12-16 00:00:00+00',
  'Maryland Cannabis Administration regulations governing dispensary agent training, certification, and compliance.',
  'Initial seed for launch readiness — mirrors latest regulatory_content sync (2025-12-16).'
);

-- Gate 5: add unmapped_reason column to video_assets (mirrors course_modules pattern)
ALTER TABLE public.video_assets ADD COLUMN IF NOT EXISTS unmapped_reason TEXT;

-- Tag the 4 orphan video assets with accepted-exclusion reasons
UPDATE public.video_assets
SET unmapped_reason = 'storage_hosted_orientation_shared_asset'
WHERE id = '8b929760-c572-45c1-b6a2-8a939c437957';

UPDATE public.video_assets
SET unmapped_reason = 'welcome_intro_shared_asset_2026-06-08'
WHERE id = '46e1794d-524e-4c78-bf7e-33aed6d25020';

UPDATE public.video_assets
SET unmapped_reason = 'rvt_section_video_pending_module_remap_2026-06-18'
WHERE id IN ('069082d4-3325-4960-99f2-e3ea4a0d287c','0fd47100-2171-4d29-a9d1-11f49958c428');
