-- Store the 9/16/26 MCA NOPA informal web draft of COMAR 14.17.15.05
-- as a proposed row. It is not final law and must not be selected as current COMAR.

ALTER TABLE public.regulatory_content
  ADD COLUMN IF NOT EXISTS authority_status text NOT NULL DEFAULT 'current',
  ADD COLUMN IF NOT EXISTS authority_label text;

ALTER TABLE public.regulatory_content
  DROP CONSTRAINT IF EXISTS regulatory_content_authority_status_check;

ALTER TABLE public.regulatory_content
  ADD CONSTRAINT regulatory_content_authority_status_check
  CHECK (authority_status IN ('current', 'proposed'));

COMMENT ON COLUMN public.regulatory_content.authority_status IS
  'current = adopted COMAR text. proposed = not final law and must not be taught or searched as a current obligation.';

COMMENT ON COLUMN public.regulatory_content.authority_label IS
  'Required status label for proposed rows. Null on current law.';

CREATE OR REPLACE FUNCTION public.search_regulatory_content(p_query text, p_limit integer DEFAULT 3)
 RETURNS TABLE(section_number text, section_title text, content_text text, source_url text, rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_words text[];
  v_tsq   tsquery;
BEGIN
  SELECT array_agg(w) INTO v_words
  FROM (
    SELECT DISTINCT lower(t) AS w
    FROM regexp_split_to_table(coalesce(p_query, ''), '[^a-zA-Z0-9]+') AS t
    WHERE length(t) >= 4
      AND lower(t) NOT IN ('what','when','where','which','that','this','with','from','have',
                           'does','your','about','they','them','there','their','into','much',
                           'many','need','know','tell','like','just','some','been','will','more')
    LIMIT 12
  ) s;

  IF v_words IS NULL OR array_length(v_words, 1) IS NULL THEN
    RETURN;
  END IF;

  v_tsq := to_tsquery('english', array_to_string(v_words, ' | '));

  RETURN QUERY
  SELECT rc.section_number,
         rc.section_title,
         rc.content_text,
         rc.source_url,
         ts_rank(v.tsv, v_tsq, 1) AS rank
  FROM public.regulatory_content rc,
       LATERAL (SELECT setweight(to_tsvector('english', coalesce(rc.section_title, '')), 'A')
                    || setweight(to_tsvector('english', coalesce(rc.content_text, '')), 'B') AS tsv) v
  WHERE rc.authority_status = 'current'
    AND v.tsv @@ v_tsq
  ORDER BY rank DESC
  LIMIT greatest(1, least(coalesce(p_limit, 3), 5));
END;
$function$;

INSERT INTO public.regulatory_content (
  section_number,
  section_title,
  content_text,
  source_url,
  effective_date,
  last_checked_at,
  last_modified_at,
  version_hash,
  created_at,
  plain_language_summary,
  compliance_tips,
  change_impact_level,
  authority_status,
  authority_label
)
SELECT
  '14.17.15.05',
  'PROPOSED informal web draft 9/16/26, not final law — 14.17.15.05 Training',
  $nopa$PROPOSED informal web draft 9/16/26, not final law

COMAR 14.17.15.05 Training.
Authority: Alcoholic Beverages and Cannabis Article, §§36-202, 36-203, 36-501, and 36-1001—36-1003, Annotated Code of Maryland.
Source document: Maryland Cannabis Administration notice of proposed action, informal web draft dated 9/16/26.
https://cannabis.maryland.gov/Documents/2026_PDF_Files/OPGA/COMAR%2014.17.01%2c%20.02%2c%20.05-.11%2c%20.14-.16%2c%20and%20.18-.21%20NOPA%20INFORMAL%20WEB%20DRAFT%209.16.26.pdf
This row is not final law. Bracketed text is shown in that draft as deleted. Do not teach any part of it as a current obligation. That includes the 90-day, every-2-years, and 10-day items.

.05 Training.
A. The licensee shall train all registered agents on:
(1) Federal and State cannabis laws and regulation and other laws and regulations pertinent to the agent's responsibilities;
(2) Standard operating procedures:
(a) Within 30 days of a new employee's start date; and
(b) Within 30 days of any changes to the licensee's standard operating procedures that impact the employee's duties or working conditions;
[(3) The State alcohol and drug free workplace policy, as identified in COMAR 21.11.08.03; ]
[(4)] (3)—[(6)] (5) (text unchanged)
B. (text unchanged)
[C. Within 90 days of employment start date and thereafter, a registered agent employed by a cannabis licensee shall complete a responsible vendor training program that:
(1) Meets the minimum requirements under Alcoholic Beverages and Cannabis Article, §§36-1001—36-1003, Annotated Code of Maryland; and
(2) Is registered with the Administration in accordance with §E(3) of this regulation.]
C. In addition to the training requirements under §A of this regulation, a cannabis licensee shall require each registered cannabis agent to complete a cannabis agent training program approved by the Administration in accordance with §D of this regulation:
(1) Within 90 days of the cannabis agent's start date as an employee of or volunteer for the cannabis licensee; and
(2) At least once every 2 years.
[D. A responsible vendor cannabis agent training program required under §E of this regulation shall be in addition to the training requirements under §A of this regulation.
E. Responsible Vendor Training Program.
(1) To offer a responsible medical or adult-use cannabis vendor, server, and seller training program, a person shall submit an application to the Administration.
(2) To be considered for approval, the proposed training program application shall meet the minimum educational standards established in Alcoholic Beverages and Cannabis Article, §36-1001(c), Annotated Code of Maryland.
(3) Applications approved by the Administration shall be registered with the Administration for a period of 3 years from the date of approval.
(4) The Administration shall assess a fee for the application, registration, and renewal of a responsible vendor training program under this regulation as specified in COMAR 14.17.21.
(5) A person offering a responsible vendor training program under this paragraph may not have ownership or control of any cannabis license.
(6) A person offering a responsible vendor training program shall:
(a) Maintain records for at least 4 years; and
(b) Make these records available to the Administration upon request.]
D. Cannabis Agent Training Program.
(1) To offer a cannabis agent training program, a person shall submit an application to the Administration.
(2) To be considered for approval, the proposed training program application shall meet the educational standards established in Alcoholic Beverages and Cannabis Article, §36-1001(c), Annotated Code of Maryland.
(3) An approved training program shall provide a core curriculum of relevant statutory and regulatory provisions, including:
(a) Administrative and criminal liability and license and court sanctions;
(b) Statutory and regulatory requirements for employees and owners;
(c) State and local licensing and enforcement;
(d) Public health and safety standards relevant to each license type;
(e) Grower, processor, or dispensary operations as established in this subtitle and Administration guidance;
(f) Cannabis product requirements;
(g) For dispensaries, the medical cannabis program.
(3) Applications approved by the Administration shall be registered with the Administration for a period of 3 years from the date of approval.
(4) A provider of an approved training program shall implement any MCA-requested statutory or regulatory updates to all relevant training modules within 10 days of written notification.
(5) The Administration shall assess a fee for the application and renewal of a cannabis agent training program under this regulation as specified in COMAR 14.17.21.
(6) An owner or employee of an entity providing a cannabis agent training program may not have employment by or interest in a Maryland cannabis licensee or registrant.
(7) A person offering a cannabis agent training program shall:
(a) Maintain records for at least 4 years; and
(b) Make these records available to the Administration upon request.
$nopa$,
  'https://cannabis.maryland.gov/Documents/2026_PDF_Files/OPGA/COMAR%2014.17.01%2c%20.02%2c%20.05-.11%2c%20.14-.16%2c%20and%20.18-.21%20NOPA%20INFORMAL%20WEB%20DRAFT%209.16.26.pdf',
  NULL,
  timestamptz '2026-09-16 09:52:04+00',
  timestamptz '2026-09-16 09:52:04+00',
  'nopa-informal-web-draft-2026-09-16',
  timestamptz '2026-09-16 09:52:04+00',
  'PROPOSED informal web draft 9/16/26, not final law. This summary is not a current training obligation.',
  '[]'::jsonb,
  'minor',
  'proposed',
  'PROPOSED informal web draft 9/16/26, not final law'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.regulatory_content
  WHERE section_number = '14.17.15.05'
    AND version_hash = 'nopa-informal-web-draft-2026-09-16'
);
