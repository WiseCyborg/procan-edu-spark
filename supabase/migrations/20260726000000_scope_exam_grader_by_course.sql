-- Scope the exam grader to the attempt's course.
-- Fixes: submit_exam previously required ALL active questions across every course
-- (430 pooled), making every course's final exam unpassable. Now it scopes to the
-- attempt's course via an explicit course->section mapping, and reads the course's
-- own passing threshold (RVT/consumer 80, specialty 85) instead of a hard-coded 80.
-- This migration is idempotent and reflects state already applied in production.

CREATE TABLE IF NOT EXISTS public.exam_course_sections (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, section_number)
);

ALTER TABLE public.exam_course_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_course_sections readable by authenticated" ON public.exam_course_sections;
CREATE POLICY "exam_course_sections readable by authenticated"
  ON public.exam_course_sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "exam_course_sections admin write" ON public.exam_course_sections;
CREATE POLICY "exam_course_sections admin write"
  ON public.exam_course_sections FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.exam_course_sections (course_id, section_number)
SELECT c.id, q.section_number
FROM courses c
JOIN LATERAL (
  SELECT DISTINCT section_number FROM exam_questions
  WHERE is_active AND section_number <@ (
    CASE
      WHEN c.id='e6841a2f-4e92-47c3-9ed4-243ccc22338b' THEN int4range(1,19)
      WHEN c.id='33333333-3333-4333-a333-333333333333' THEN int4range(200,213)
      WHEN c.id='22222222-2222-4222-a222-222222222222' THEN int4range(100,112)
      WHEN c.id='c1ba4f7f-1e62-407d-b463-7e57e8f15520' THEN int4range(301,311)
      WHEN c.id='fd6dc848-89a5-498e-a9e9-9647228fb532' THEN int4range(321,329)
      WHEN c.id='6839959e-40ea-4398-8fe6-682293e1f96a' THEN int4range(341,345)
      WHEN c.id='11111111-1111-4111-a111-111111111111' THEN int4range(360,371)
      ELSE int4range(-1,-1)
    END)
) q ON true
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.submit_exam(p_attempt_id uuid, p_answers jsonb, p_time_taken integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid; v_attempt RECORD; v_passing integer; v_total integer;
  v_answered integer; v_correct integer; v_score integer; v_passed boolean;
  v_topics jsonb; v_failed jsonb; v_course_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF jsonb_typeof(p_answers) <> 'array' THEN RETURN jsonb_build_object('ok',false,'error','answers_must_be_array'); END IF;

  SELECT * INTO v_attempt FROM exam_attempts WHERE id = p_attempt_id;
  IF v_attempt.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','attempt_not_found'); END IF;
  IF v_attempt.user_id <> v_user_id THEN RETURN jsonb_build_object('ok',false,'error','not_your_attempt'); END IF;
  IF v_attempt.completed_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','attempt_already_completed'); END IF;

  v_course_id := v_attempt.course_id;

  SELECT COALESCE(c.passing_score, v_attempt.passing_score, 80) INTO v_passing
    FROM courses c WHERE c.id = v_course_id;
  v_passing := COALESCE(v_passing, v_attempt.passing_score, 80);

  SELECT count(*) INTO v_total
  FROM exam_questions q
  WHERE q.is_active
    AND q.section_number IN (SELECT section_number FROM exam_course_sections WHERE course_id = v_course_id);

  IF v_total = 0 THEN RETURN jsonb_build_object('ok',false,'error','no_exam_questions_for_course'); END IF;

  SELECT count(DISTINCT x->>'question_id') INTO v_answered
  FROM jsonb_array_elements(p_answers) x
  WHERE EXISTS (
    SELECT 1 FROM exam_questions q
    WHERE q.question_id = x->>'question_id' AND q.is_active
      AND q.section_number IN (SELECT section_number FROM exam_course_sections WHERE course_id = v_course_id)
  );

  IF v_answered <> v_total THEN
    RETURN jsonb_build_object('ok',false,'error','incomplete_submission','answered',v_answered,'required',v_total);
  END IF;

  WITH scope AS (
    SELECT section_number FROM exam_course_sections WHERE course_id = v_course_id
  ),
  submitted AS (
    SELECT DISTINCT ON (x->>'question_id') x->>'question_id' AS qid, x->>'answer' AS ans
    FROM jsonb_array_elements(p_answers) x
  ),
  graded AS (
    SELECT q.section_number, q.section_title, q.comar_section, q.topic_area,
           (lower(btrim(COALESCE(s.ans,''))) = lower(btrim(k.correct_answer))) AS is_correct
    FROM exam_questions q
    JOIN exam_answer_key k ON k.question_id = q.question_id
    LEFT JOIN submitted s ON s.qid = q.question_id
    WHERE q.is_active AND q.section_number IN (SELECT section_number FROM scope)
  ),
  by_section AS (
    SELECT section_number, min(section_title) AS section_title, min(comar_section) AS comar_section,
           min(topic_area) AS topic_area,
           count(*) FILTER (WHERE is_correct) AS sec_correct, count(*) AS sec_total
    FROM graded GROUP BY section_number
  )
  SELECT (SELECT count(*) FILTER (WHERE is_correct) FROM graded),
         jsonb_agg(jsonb_build_object(
           'section_number',section_number,'section_title',section_title,
           'comar_section',comar_section,'topic_area',topic_area,
           'questions_correct',sec_correct,'questions_total',sec_total,
           'score_percentage',ROUND((sec_correct::numeric/NULLIF(sec_total,0))*100)::int,
           'needs_remediation',ROUND((sec_correct::numeric/NULLIF(sec_total,0))*100)::int < v_passing
         ) ORDER BY section_number),
         jsonb_agg(section_number ORDER BY section_number)
           FILTER (WHERE ROUND((sec_correct::numeric/NULLIF(sec_total,0))*100)::int < v_passing)
    INTO v_correct, v_topics, v_failed
  FROM by_section;

  v_score := ROUND((v_correct::numeric / v_total) * 100)::int;
  v_passed := (v_score >= v_passing) AND (v_failed IS NULL);

  UPDATE exam_attempts
  SET total_score=v_score, is_passed=v_passed, topic_scores=v_topics, passing_score=v_passing,
      time_taken=COALESCE(p_time_taken, time_taken), completed_at=now(),
      metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('graded_by','server','graded_at',now())
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('ok',true,'score',v_score,'passed',v_passed,
    'correct_count',v_correct,'total_questions',v_total,'passing_score',v_passing,
    'time_taken',COALESCE(p_time_taken, v_attempt.time_taken),
    'topic_scores',v_topics,'sections_failed',COALESCE(v_failed,'[]'::jsonb));
END;
$function$;
