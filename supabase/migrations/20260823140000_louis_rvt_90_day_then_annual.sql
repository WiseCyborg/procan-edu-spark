-- Louis Hendricks III (Director of Compliance), Aug 16 2026.
-- William F. Cunningham Jr. authorized applying this language on 2026-08-23.
--
-- SOURCE OF TRUTH: training is still annual and still named Responsible Vendor
-- Training (RVT). COMAR 14.17.15.05(C):
--   "C. Within 90 days of employment start date and annually thereafter, a
--    registered agent employed by a cannabis licensee shall complete a
--    responsible vendor training program that:"
-- If an agent starts after July 1, 2026 they must complete their annual
-- training within 90 days of employment, then every year afterwards.
--
-- SUPERSEDED / DO NOT RUN: any staged change that flips Section 17 keys from
-- "every 12 months" / "every year" to "every 2 years". That was William's
-- Aug 14 HB 622 guess. Louis rejected it. Do not key a two-year answer.
--
-- This migration is the repo record of the content change. Do not apply it
-- to production from this PR; PR only.

-- ---------------------------------------------------------------------------
-- Section 17 exam questions keyed to the renewal cycle
-- ---------------------------------------------------------------------------

UPDATE public.exam_questions
SET
  question_text = 'Under COMAR 14.17.15.05(C), when must a registered agent complete Responsible Vendor Training (RVT)?',
  options = '["Every 6 months", "Within 90 days of employment start date, and annually thereafter", "Every 2 years"]'::jsonb,
  updated_at = now()
WHERE question_id = 's17_q0';

UPDATE public.exam_answer_key
SET correct_answer = 'Within 90 days of employment start date, and annually thereafter'
WHERE question_id = 's17_q0'; -- no updated_at column on exam_answer_key

UPDATE public.exam_questions
SET
  question_text = 'How must dispensary agents complete and renew Responsible Vendor Training (RVT) under COMAR 14.17.15.05(C)?',
  options = '["Within 90 days of employment start date, and annually thereafter", "Every two years", "Every five years"]'::jsonb,
  updated_at = now()
WHERE question_id = 's17_q2';

UPDATE public.exam_answer_key
SET correct_answer = 'Within 90 days of employment start date, and annually thereafter'
WHERE question_id = 's17_q2';

-- s17_q5 (90 days) and s17_q7 (90 days then annually) already match Louis.
-- Do not retarget those keys to a two-year answer.

-- ---------------------------------------------------------------------------
-- Module 0 quiz: "How often must RVT certification be renewed?"
-- ---------------------------------------------------------------------------

UPDATE public.course_modules
SET
  quiz_questions = (
    SELECT jsonb_agg(new_elem ORDER BY ord)
    FROM jsonb_array_elements(quiz_questions) WITH ORDINALITY AS t(elem, ord),
    LATERAL (
      SELECT CASE
        WHEN elem->>'id' = 'q0-5'
          OR elem->>'question' = 'How often must RVT certification be renewed?'
        THEN jsonb_strip_nulls(jsonb_build_object(
          'id', coalesce(elem->>'id', 'q0-5'),
          'topic', coalesce(elem->>'topic', 'Compliance Training'),
          'options', '["Every 6 months", "Within 90 days of employment start date, and annually thereafter", "Every 2 years", "It never expires"]'::jsonb,
          'question', 'Under COMAR 14.17.15.05(C), when must a registered agent complete Responsible Vendor Training (RVT)?',
          'difficulty', coalesce(elem->>'difficulty', 'easy'),
          'relatedModules', coalesce(elem->'relatedModules', '["part1"]'::jsonb),
          'comarRef', 'COMAR 14.17.15.05(C)',
          'correct', 'Within 90 days of employment start date, and annually thereafter',
          'explanation', 'COMAR 14.17.15.05(C): "C. Within 90 days of employment start date and annually thereafter, a registered agent employed by a cannabis licensee shall complete a responsible vendor training program that:" Training remains annual. If an agent starts after July 1, 2026 they must complete their annual training within 90 days of employment, then every year afterwards.'
        ))
        ELSE elem
      END AS new_elem
    ) x
  ),
  updated_at = now()
WHERE course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
  AND module_number = 0
  AND quiz_questions IS NOT NULL;

UPDATE public.module_quiz_answers
SET
  question_text = 'Under COMAR 14.17.15.05(C), when must a registered agent complete Responsible Vendor Training (RVT)?',
  correct_answer = 'Within 90 days of employment start date, and annually thereafter',
  explanation = 'COMAR 14.17.15.05(C): "C. Within 90 days of employment start date and annually thereafter, a registered agent employed by a cannabis licensee shall complete a responsible vendor training program that:" Training remains annual. If an agent starts after July 1, 2026 they must complete their annual training within 90 days of employment, then every year afterwards.',
  updated_at = now()
WHERE source_question_id = 'q0-5'
   OR (
     question_text = 'How often must RVT certification be renewed?'
     AND module_id IN (
       SELECT id FROM public.course_modules
       WHERE course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
         AND module_number = 0
     )
   );

-- ---------------------------------------------------------------------------
-- Modules that quote COMAR 14.17.15.05(C): 1, 18, 19, 21
-- Keep a COMAR quote, use Louis's C. wording, keep the name RVT.
-- ---------------------------------------------------------------------------

UPDATE public.course_modules
SET
  content = replace(
    content,
    'Second, and separately, you must complete a **Responsible Vendor Training program** registered with the Administration **within 90 days of your employment start date and annually thereafter** (14.17.15.05C).',
    $louis$Second, and separately, COMAR 14.17.15.05(C) states: "C. Within 90 days of employment start date and annually thereafter, a registered agent employed by a cannabis licensee shall complete a responsible vendor training program that:" The program is still named **Responsible Vendor Training (RVT)**. If an agent starts after July 1, 2026 they must complete their annual training within 90 days of employment, then every year afterwards.$louis$
  ),
  updated_at = now()
WHERE course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
  AND module_number = 1
  AND content LIKE '%within 90 days of your employment start date and annually thereafter%';

UPDATE public.course_modules
SET
  content = replace(
    content,
    'A registered agent must complete an MCA-approved Responsible Vendor Training program **within 90 days of their employment start date and annually thereafter**.',
    $louis$COMAR 14.17.15.05(C) states: "C. Within 90 days of employment start date and annually thereafter, a registered agent employed by a cannabis licensee shall complete a responsible vendor training program that:" The program is still named **Responsible Vendor Training (RVT)**. If an agent starts after July 1, 2026 they must complete their annual training within 90 days of employment, then every year afterwards.$louis$
  ),
  updated_at = now()
WHERE course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
  AND module_number = 18
  AND content LIKE '%MCA-approved Responsible Vendor Training program **within 90 days%';

UPDATE public.course_modules
SET
  content = replace(
    content,
    'A registered cannabis business agent must complete an MCA-approved **Responsible Vendor Training** program **within 90 days of their employment start date and annually thereafter**. The annual renewal is a requirement, not a recommendation, and as a supervisor you own tracking it for your whole team.',
    $louis$COMAR 14.17.15.05(C) states: "C. Within 90 days of employment start date and annually thereafter, a registered agent employed by a cannabis licensee shall complete a responsible vendor training program that:" The program is still named **Responsible Vendor Training (RVT)** — MCA and COMAR still use that name. Training is still annual, not every two years. If an agent starts after July 1, 2026 they must complete their annual training within 90 days of employment, then every year afterwards. Supervisors enforce that annual renewal and tracking for the whole team.$louis$
  ),
  updated_at = now()
WHERE course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
  AND module_number = 19
  AND content LIKE '%MCA-approved **Responsible Vendor Training** program **within 90 days%';

UPDATE public.course_modules
SET
  content = replace(
    content,
    $old$**Obligation 2 — Responsible Vendor Training, COMAR 14.17.15.05(C).** Within **90 days of
employment start date and annually thereafter**, each registered agent must complete an RVT
programme that meets the minimum standards in Alcoholic Beverages and Cannabis Article
§§36-1001—36-1003 and is **registered with the Administration**.$old$,
    $louis$**Obligation 2 — Responsible Vendor Training, COMAR 14.17.15.05(C).** COMAR states: "C. Within 90 days of employment start date and annually thereafter, a registered agent employed by a cannabis licensee shall complete a responsible vendor training program that:" The program is still named **Responsible Vendor Training (RVT)**. If an agent starts after July 1, 2026 they must complete their annual training within 90 days of employment, then every year afterwards. Each registered agent must complete an RVT programme that meets the minimum standards in Alcoholic Beverages and Cannabis Article §§36-1001—36-1003 and is **registered with the Administration**.$louis$
  ),
  updated_at = now()
WHERE course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
  AND module_number = 21
  AND content LIKE '%Obligation 2 — Responsible Vendor Training, COMAR 14.17.15.05(C).%';

-- Guard: never leave a two-year RVT-cycle key on the Section 17 renewal questions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.exam_answer_key
    WHERE question_id IN ('s17_q0', 's17_q2')
      AND correct_answer ILIKE '%2 year%'
  ) THEN
    RAISE EXCEPTION 'Louis RVT rule: Section 17 renewal keys must not be a two-year answer';
  END IF;
END $$;
