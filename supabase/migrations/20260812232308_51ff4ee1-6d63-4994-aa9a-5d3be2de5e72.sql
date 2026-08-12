-- 1) Backfill the protected answer key from learner-visible quiz payloads
INSERT INTO public.module_quiz_answers (module_id, course_id, question_index, question_text, correct_answer, explanation, source_question_id)
SELECT cm.id, cm.course_id, (q.ord - 1)::int, q.item->>'question', q.item->>'correct', q.item->>'explanation', q.item->>'id'
FROM public.course_modules cm
CROSS JOIN LATERAL jsonb_array_elements(cm.quiz_questions) WITH ORDINALITY AS q(item, ord)
WHERE jsonb_typeof(cm.quiz_questions) = 'array'
  AND q.item ? 'correct'
  AND nullif(btrim(q.item->>'correct'), '') IS NOT NULL
ON CONFLICT (module_id, question_index) DO NOTHING;

-- 2) Strip answer keys and explanations from the learner-visible payload
UPDATE public.course_modules cm
SET quiz_questions = COALESCE((
      SELECT jsonb_agg((q.item - 'correct' - 'explanation') ORDER BY q.ord)
      FROM jsonb_array_elements(cm.quiz_questions) WITH ORDINALITY AS q(item, ord)
    ), '[]'::jsonb)
WHERE jsonb_typeof(cm.quiz_questions) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(cm.quiz_questions) e
    WHERE e ? 'correct' OR e ? 'explanation'
  );

-- 3) Prevent reintroduction of answer keys into the public payload
CREATE OR REPLACE FUNCTION public.strip_quiz_answer_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  IF NEW.quiz_questions IS NULL OR jsonb_typeof(NEW.quiz_questions) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR rec IN
    SELECT (q.ord - 1)::int AS idx, q.item AS item
    FROM jsonb_array_elements(NEW.quiz_questions) WITH ORDINALITY AS q(item, ord)
    WHERE q.item ? 'correct'
      AND nullif(btrim(q.item->>'correct'), '') IS NOT NULL
  LOOP
    INSERT INTO public.module_quiz_answers (module_id, course_id, question_index, question_text, correct_answer, explanation, source_question_id)
    VALUES (NEW.id, NEW.course_id, rec.idx, rec.item->>'question', rec.item->>'correct', rec.item->>'explanation', rec.item->>'id')
    ON CONFLICT (module_id, question_index) DO UPDATE
      SET question_text = EXCLUDED.question_text,
          correct_answer = EXCLUDED.correct_answer,
          explanation = EXCLUDED.explanation,
          source_question_id = EXCLUDED.source_question_id,
          updated_at = now();
  END LOOP;

  SELECT COALESCE(jsonb_agg((q.item - 'correct' - 'explanation') ORDER BY q.ord), '[]'::jsonb)
    INTO NEW.quiz_questions
  FROM jsonb_array_elements(NEW.quiz_questions) WITH ORDINALITY AS q(item, ord);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strip_quiz_answer_key ON public.course_modules;
CREATE TRIGGER trg_strip_quiz_answer_key
BEFORE INSERT OR UPDATE OF quiz_questions ON public.course_modules
FOR EACH ROW EXECUTE FUNCTION public.strip_quiz_answer_key();