-- Clean up orphaned exam_attempts stubs for Emp1 (created by failed check-in inserts)
-- These have completed_at IS NULL and total_score = 0, blocking exam with false cooldowns
DELETE FROM public.exam_attempts
WHERE user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
  AND completed_at IS NULL
  AND total_score = 0;