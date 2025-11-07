-- Create module compliance review tracking table
CREATE TABLE IF NOT EXISTS public.module_compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_review_due TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '6 months'),
  review_notes TEXT,
  comar_version_id UUID REFERENCES public.comar_versions(id),
  compliance_status TEXT NOT NULL DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'needs_update', 'under_review')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_module_compliance_next_review ON public.module_compliance_reviews(next_review_due);
CREATE INDEX idx_module_compliance_module ON public.module_compliance_reviews(module_id);

-- Enable RLS
ALTER TABLE public.module_compliance_reviews ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage compliance reviews"
  ON public.module_compliance_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Everyone can view compliance status
CREATE POLICY "Anyone can view compliance reviews"
  ON public.module_compliance_reviews
  FOR SELECT
  USING (true);

-- Create function to get modules needing review
CREATE OR REPLACE FUNCTION public.get_modules_needing_review()
RETURNS TABLE(
  module_id UUID,
  module_number INTEGER,
  module_title TEXT,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  days_overdue INTEGER,
  comar_reference TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH latest_reviews AS (
    SELECT 
      mcr.module_id,
      mcr.reviewed_at,
      mcr.next_review_due,
      ROW_NUMBER() OVER (PARTITION BY mcr.module_id ORDER BY mcr.reviewed_at DESC) as rn
    FROM public.module_compliance_reviews mcr
  )
  SELECT 
    cm.id as module_id,
    cm.module_number,
    cm.title as module_title,
    lr.reviewed_at as last_reviewed_at,
    GREATEST(0, EXTRACT(DAY FROM (NOW() - lr.next_review_due))::INTEGER) as days_overdue,
    cm.comar_reference
  FROM public.course_modules cm
  LEFT JOIN latest_reviews lr ON lr.module_id = cm.id AND lr.rn = 1
  WHERE 
    lr.next_review_due IS NULL OR lr.next_review_due < NOW()
  ORDER BY lr.next_review_due ASC NULLS FIRST;
END;
$$;

-- Create function to mark module as reviewed
CREATE OR REPLACE FUNCTION public.mark_module_reviewed(
  p_module_id UUID,
  p_review_notes TEXT DEFAULT NULL,
  p_compliance_status TEXT DEFAULT 'compliant'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_review_id UUID;
  v_latest_comar_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get latest COMAR version
  SELECT id INTO v_latest_comar_id
  FROM public.comar_versions
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Insert review record
  INSERT INTO public.module_compliance_reviews (
    module_id,
    reviewed_by,
    reviewed_at,
    next_review_due,
    review_notes,
    comar_version_id,
    compliance_status
  ) VALUES (
    p_module_id,
    auth.uid(),
    NOW(),
    NOW() + INTERVAL '6 months',
    p_review_notes,
    v_latest_comar_id,
    p_compliance_status
  )
  RETURNING id INTO v_review_id;

  -- Clear any pending review queue items for this module
  UPDATE public.content_review_queue
  SET status = 'completed',
      reviewed_at = NOW(),
      reviewed_by = auth.uid()
  WHERE content_type = 'course_module'
    AND content_id = p_module_id::TEXT
    AND status = 'pending';

  RETURN v_review_id;
END;
$$;