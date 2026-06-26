CREATE POLICY "Users can finalize their own incomplete exam attempts"
ON public.exam_attempts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND completed_at IS NULL
)
WITH CHECK (
  auth.uid() = user_id
  AND completed_at IS NOT NULL
  AND total_score BETWEEN 0 AND 100
  AND passing_score = 80
  AND time_taken IS NOT NULL
  AND time_taken >= 0
  AND jsonb_typeof(topic_scores) = 'array'
  AND jsonb_array_length(topic_scores) = 18
);