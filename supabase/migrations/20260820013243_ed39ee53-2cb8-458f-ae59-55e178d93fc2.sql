-- 1) Anonymous visitors may read ONLY global feature flags prefixed with public_
DROP POLICY IF EXISTS "Anon can read public global feature flags" ON public.feature_flags;
CREATE POLICY "Anon can read public global feature flags"
ON public.feature_flags
FOR SELECT
TO anon
USING (scope = 'global' AND flag_key LIKE 'public\_%');

GRANT SELECT ON public.feature_flags TO anon;

-- 2) Idempotent copy neutralization on ACTIVE email templates
UPDATE public.email_templates
SET subject_line = regexp_replace(
      regexp_replace(
        regexp_replace(subject_line, 'RVT [Cc]ertification', 'compliance training', 'g'),
        'RVT [Cc]ertificate', 'completion record', 'g'),
      '(?i)\yCertificate\y', 'Completion Record', 'g'),
    html_content = regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(html_content,
                '(?i)MCA[- ]approved', 'Maryland-focused', 'g'),
              '(?i)state[- ]approved', 'internally reviewed', 'g'),
            '(?i)official (Maryland )?(RVT )?credential', 'ProCann EDU completion record', 'g'),
          '(?i)Responsible Vendor Training Certificate', 'Maryland Cannabis Compliance Training completion record', 'g'),
        'RVT [Cc]ertification', 'compliance training', 'g'),
      'RVT [Cc]ertificate', 'completion record', 'g'),
    updated_at = now()
WHERE is_active = true
  AND (
    subject_line ~* '(RVT certificat|RVT certification|\yCertificate\y)'
    OR html_content ~* '(MCA[- ]approved|state[- ]approved|official (Maryland )?(RVT )?credential|Responsible Vendor Training Certificate|RVT certificat|RVT certification)'
  );