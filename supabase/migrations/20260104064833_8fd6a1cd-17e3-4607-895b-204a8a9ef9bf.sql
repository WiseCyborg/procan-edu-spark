-- Fix the current_setting landmine in trigger_progress_milestone
-- Replace with job queue approach (no external HTTP call)

CREATE OR REPLACE FUNCTION public.trigger_progress_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_modules INTEGER;
  completed_modules INTEGER;
  progress_percentage INTEGER;
  milestone_hit INTEGER;
  old_percentage INTEGER;
BEGIN
  -- Only trigger when a module is marked as completed
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    
    -- Get total modules for this course
    SELECT COUNT(*) INTO total_modules
    FROM course_modules
    WHERE course_id = NEW.course_id AND is_active = true;
    
    -- Get completed modules count for this user
    SELECT COUNT(*) INTO completed_modules
    FROM user_progress
    WHERE user_id = NEW.user_id 
      AND course_id = NEW.course_id 
      AND is_completed = true;
    
    -- Calculate progress percentage
    IF total_modules > 0 THEN
      progress_percentage := ROUND((completed_modules::DECIMAL / total_modules) * 100);
      
      -- Calculate old percentage (before this module was completed)
      IF completed_modules > 1 THEN
        old_percentage := ROUND(((completed_modules - 1)::DECIMAL / total_modules) * 100);
      ELSE
        old_percentage := 0;
      END IF;
      
      -- Determine which milestone was crossed
      milestone_hit := NULL;
      
      IF progress_percentage >= 100 AND old_percentage < 100 THEN
        milestone_hit := 100;
      ELSIF progress_percentage >= 75 AND old_percentage < 75 THEN
        milestone_hit := 75;
      ELSIF progress_percentage >= 50 AND old_percentage < 50 THEN
        milestone_hit := 50;
      ELSIF progress_percentage >= 25 AND old_percentage < 25 THEN
        milestone_hit := 25;
      END IF;
      
      -- If a milestone was hit, queue a job instead of direct HTTP call
      IF milestone_hit IS NOT NULL THEN
        PERFORM queue_job(
          'send_progress_milestone',
          jsonb_build_object(
            'user_id', NEW.user_id,
            'milestone_percentage', milestone_hit,
            'modules_completed', completed_modules,
            'total_modules', total_modules
          ),
          'milestone_' || NEW.user_id::text || '_' || milestone_hit::text,
          NULL,
          3
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;