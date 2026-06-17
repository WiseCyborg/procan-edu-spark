CREATE UNIQUE INDEX IF NOT EXISTS course_modules_video_url_unique_per_course
  ON public.course_modules (course_id, video_url)
  WHERE video_url IS NOT NULL;