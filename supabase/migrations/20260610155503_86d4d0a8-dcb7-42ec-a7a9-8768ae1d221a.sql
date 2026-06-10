
DROP POLICY IF EXISTS "Public courses are viewable by everyone" ON public.courses;
CREATE POLICY "Public courses are viewable by everyone"
  ON public.courses FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "Public can view active videos" ON public.video_assets;
DROP POLICY IF EXISTS "video_assets_read_active" ON public.video_assets;

CREATE POLICY "Anon can view public videos"
  ON public.video_assets FOR SELECT
  TO anon
  USING (is_active = true AND access_level = 'public');

CREATE POLICY "Authenticated can view entitled videos"
  ON public.video_assets FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      access_level = 'public'
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        course_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.course_entitlements ce
          WHERE ce.user_id = auth.uid()
            AND ce.course_id = video_assets.course_id
            AND ce.status = 'active'
            AND (ce.expires_at IS NULL OR ce.expires_at > now())
        )
      )
    )
  );
