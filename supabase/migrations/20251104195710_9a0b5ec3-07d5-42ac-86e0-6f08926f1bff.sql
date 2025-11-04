-- Create exam_blueprint table to track question distribution by COMAR section
CREATE TABLE IF NOT EXISTS public.exam_blueprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_number INTEGER NOT NULL,
  section_title TEXT NOT NULL,
  comar_section TEXT NOT NULL,
  topic_area TEXT NOT NULL,
  questions_count INTEGER NOT NULL DEFAULT 2,
  passing_threshold INTEGER NOT NULL DEFAULT 80,
  related_module_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create exam_topic_scores table to track performance by topic
CREATE TABLE IF NOT EXISTS public.exam_topic_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL,
  comar_section TEXT NOT NULL,
  topic_area TEXT NOT NULL,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  questions_total INTEGER NOT NULL DEFAULT 2,
  score_percentage INTEGER NOT NULL,
  needs_remediation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add topic_scores jsonb column to exam_attempts for quick access
ALTER TABLE public.exam_attempts 
ADD COLUMN IF NOT EXISTS topic_scores JSONB DEFAULT '[]'::jsonb;

-- Insert exam blueprint data (18 sections mapping to COMAR)
INSERT INTO public.exam_blueprint (section_number, section_title, comar_section, topic_area, related_module_ids) VALUES
(1, 'Federal and State Cannabis Laws', 'COMAR 10.62.01', 'Legal Framework', ARRAY[]::UUID[]),
(2, 'Standard Operating Procedures', 'COMAR 10.62.03', 'Operational Compliance', ARRAY[]::UUID[]),
(3, 'Inventory Management', 'COMAR 10.62.04', 'Inventory Control', ARRAY[]::UUID[]),
(4, 'Sales Procedures', 'COMAR 10.62.05', 'Sales & Transactions', ARRAY[]::UUID[]),
(5, 'Safety Protocols', 'COMAR 10.62.06', 'Workplace Safety', ARRAY[]::UUID[]),
(6, 'Health and Pharmacology', 'COMAR 10.62.07', 'Medical Knowledge', ARRAY[]::UUID[]),
(7, 'Record Keeping', 'COMAR 10.62.08', 'Documentation', ARRAY[]::UUID[]),
(8, 'Security Measures', 'COMAR 10.62.09', 'Security & Loss Prevention', ARRAY[]::UUID[]),
(9, 'Compliance Standards', 'COMAR 10.62.10', 'Regulatory Compliance', ARRAY[]::UUID[]),
(10, 'Packaging Regulations', 'COMAR 10.62.11', 'Product Packaging', ARRAY[]::UUID[]),
(11, 'Labeling Requirements', 'COMAR 10.62.12', 'Product Labeling', ARRAY[]::UUID[]),
(12, 'Transportation Guidelines', 'COMAR 10.62.13', 'Transport & Distribution', ARRAY[]::UUID[]),
(13, 'Waste Management', 'COMAR 10.62.14', 'Disposal & Waste', ARRAY[]::UUID[]),
(14, 'Testing Standards', 'COMAR 10.62.15', 'Quality Assurance', ARRAY[]::UUID[]),
(15, 'Customer Education', 'COMAR 10.62.16', 'Patient Education', ARRAY[]::UUID[]),
(16, 'Emergency Procedures', 'COMAR 10.62.17', 'Emergency Response', ARRAY[]::UUID[]),
(17, 'Training Requirements', 'COMAR 10.62.18', 'Agent Training', ARRAY[]::UUID[]),
(18, 'Ethical Standards', 'COMAR 10.62.19', 'Professional Ethics', ARRAY[]::UUID[]);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exam_blueprint_section ON public.exam_blueprint(section_number);
CREATE INDEX IF NOT EXISTS idx_exam_blueprint_comar ON public.exam_blueprint(comar_section);
CREATE INDEX IF NOT EXISTS idx_exam_topic_scores_attempt ON public.exam_topic_scores(exam_attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_topic_scores_section ON public.exam_topic_scores(section_number);
CREATE INDEX IF NOT EXISTS idx_exam_topic_scores_remediation ON public.exam_topic_scores(needs_remediation);

-- Enable RLS
ALTER TABLE public.exam_blueprint ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_topic_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_blueprint (public read, admin write)
CREATE POLICY "Anyone can view exam blueprint"
  ON public.exam_blueprint FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage exam blueprint"
  ON public.exam_blueprint FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for exam_topic_scores
CREATE POLICY "Users can view their own topic scores"
  ON public.exam_topic_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_attempts
      WHERE exam_attempts.id = exam_topic_scores.exam_attempt_id
      AND exam_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own topic scores"
  ON public.exam_topic_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exam_attempts
      WHERE exam_attempts.id = exam_topic_scores.exam_attempt_id
      AND exam_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage topic scores"
  ON public.exam_topic_scores FOR ALL
  USING (true);

CREATE POLICY "Admins can view all topic scores"
  ON public.exam_topic_scores FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));