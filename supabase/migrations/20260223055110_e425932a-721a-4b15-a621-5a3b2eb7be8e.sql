-- Allow users to delete their own incomplete exam attempt stubs (for rollback safety)
-- Only allows deleting attempts that have NOT been completed (no score, no completion)
CREATE POLICY "Users can delete own incomplete attempt stubs"
  ON public.exam_attempts
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND completed_at IS NULL
    AND total_score = 0
  );