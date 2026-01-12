-- 1) Update check constraint to allow new course types
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_course_type_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_course_type_check 
  CHECK (course_type = ANY (ARRAY['professional', 'consumer', 'public', 'manager', 'specialty']::text[]));

-- 2) Add prerequisite tracking to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS prerequisite_course_id UUID REFERENCES public.courses(id),
ADD COLUMN IF NOT EXISTS prerequisite_required BOOLEAN DEFAULT false;

-- 3) Insert the 3 new training tracks
INSERT INTO public.courses (id, title, description, course_type, target_audience, is_active, is_public, passing_score, completion_badge_name)
VALUES 
  ('11111111-1111-4111-a111-111111111111', 
   'Manager Compliance Training', 
   'Supervisory and operational compliance training for dispensary managers.',
   'manager', 'managers', true, false, 80, 'Manager Certified'),
  
  ('22222222-2222-4222-a222-222222222222',
   'Ganjier Certification',
   'Advanced cannabis expertise training.',
   'specialty', 'specialists', true, false, 85, 'Ganjier Certified'),
  
  ('33333333-3333-4333-a333-333333333333',
   'Cannabis Sommelier Certification',
   'Sensory evaluation and pairing expertise.',
   'specialty', 'specialists', true, false, 85, 'Sommelier Certified')
ON CONFLICT (id) DO NOTHING;

-- 4) Set prerequisites
UPDATE public.courses SET prerequisite_course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b', prerequisite_required = true
WHERE id = '11111111-1111-4111-a111-111111111111';

UPDATE public.courses SET prerequisite_course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b', prerequisite_required = false
WHERE id = '22222222-2222-4222-a222-222222222222';

UPDATE public.courses SET prerequisite_course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b', prerequisite_required = false
WHERE id = '33333333-3333-4333-a333-333333333333';

-- 5) Create prerequisite check function
CREATE OR REPLACE FUNCTION public.check_course_prerequisite(p_user_id UUID, p_course_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course RECORD;
  v_certificate_exists BOOLEAN := false;
BEGIN
  SELECT c.*, prereq.title as prereq_title INTO v_course
  FROM courses c LEFT JOIN courses prereq ON prereq.id = c.prerequisite_course_id
  WHERE c.id = p_course_id;
  
  IF NOT FOUND THEN RETURN jsonb_build_object('can_access', false, 'reason', 'course_not_found'); END IF;
  IF v_course.prerequisite_course_id IS NULL THEN RETURN jsonb_build_object('can_access', true, 'has_prerequisite', false); END IF;
  
  SELECT EXISTS (SELECT 1 FROM certificates WHERE user_id = p_user_id AND course_id = v_course.prerequisite_course_id AND (is_revoked IS NULL OR is_revoked = false)) INTO v_certificate_exists;
  
  IF v_course.prerequisite_required AND NOT v_certificate_exists THEN
    RETURN jsonb_build_object('can_access', false, 'reason', 'prerequisite_required', 'prerequisite_course_id', v_course.prerequisite_course_id, 'prerequisite_title', v_course.prereq_title);
  END IF;
  
  RETURN jsonb_build_object('can_access', true, 'has_prerequisite', true, 'prerequisite_completed', v_certificate_exists, 'prerequisite_recommended', NOT v_course.prerequisite_required AND NOT v_certificate_exists);
END;
$$;