-- Phase 1: Image Asset Management
CREATE TABLE image_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key text UNIQUE NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  alt_text text NOT NULL,
  usage_locations text[] DEFAULT '{}',
  dimensions jsonb,
  file_size_kb integer,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE INDEX idx_image_assets_key ON image_assets(asset_key);
CREATE INDEX idx_image_assets_active ON image_assets(is_active) WHERE is_active = true;

-- Phase 2: Regulatory Monitoring
CREATE TABLE regulatory_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_number text NOT NULL,
  section_title text NOT NULL,
  content_text text NOT NULL,
  content_html text,
  source_url text NOT NULL,
  effective_date date,
  last_checked_at timestamptz DEFAULT now(),
  last_modified_at timestamptz DEFAULT now(),
  version_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(section_number, version_hash)
);

CREATE TABLE regulatory_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_number text NOT NULL,
  change_type text NOT NULL,
  previous_content text,
  new_content text NOT NULL,
  detected_at timestamptz DEFAULT now(),
  ai_impact_analysis text,
  affected_modules text[],
  review_status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE content_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulatory_update_id uuid REFERENCES regulatory_updates(id),
  content_type text NOT NULL,
  content_id uuid,
  location text NOT NULL,
  urgency text DEFAULT 'medium',
  ai_suggested_change text,
  status text DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_regulatory_updates_status ON regulatory_updates(review_status, detected_at DESC);
CREATE INDEX idx_content_review_status ON content_review_queue(status, urgency, created_at DESC);
CREATE INDEX idx_regulatory_content_section ON regulatory_content(section_number, last_modified_at DESC);

-- Phase 3: Outdated Content Detection Function
CREATE OR REPLACE FUNCTION detect_outdated_content()
RETURNS TABLE (
  content_type text,
  content_id uuid,
  location text,
  last_updated_at timestamptz,
  days_since_update integer,
  relevant_regulatory_updates integer,
  urgency_score integer,
  status text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH recent_regulatory_changes AS (
    SELECT 
      section_number,
      affected_modules,
      detected_at,
      review_status
    FROM regulatory_updates
    WHERE detected_at > NOW() - INTERVAL '90 days'
      AND review_status != 'implemented'
  ),
  module_update_ages AS (
    SELECT 
      'course_module' as content_type,
      id as content_id,
      'Module ' || module_number || ': ' || title as location,
      updated_at as last_updated_at,
      EXTRACT(DAY FROM (NOW() - updated_at))::integer as days_since_update,
      (
        SELECT COUNT(*)
        FROM recent_regulatory_changes rrc
        WHERE EXISTS (
          SELECT 1 FROM unnest(rrc.affected_modules) AS module
          WHERE title ILIKE '%' || module || '%'
        )
      ) as relevant_updates
    FROM course_modules
  ),
  faq_update_ages AS (
    SELECT 
      'faq_entry' as content_type,
      id as content_id,
      'FAQ: ' || question as location,
      updated_at as last_updated_at,
      EXTRACT(DAY FROM (NOW() - updated_at))::integer as days_since_update,
      (
        SELECT COUNT(*)
        FROM recent_regulatory_changes rrc
        WHERE EXISTS (
          SELECT 1 FROM unnest(rrc.affected_modules) AS module
          WHERE category ILIKE '%' || module || '%'
        )
      ) as relevant_updates
    FROM faq_entries
  )
  SELECT 
    content.content_type,
    content.content_id,
    content.location,
    content.last_updated_at,
    content.days_since_update,
    content.relevant_updates,
    CASE 
      WHEN relevant_updates > 5 THEN 100
      WHEN relevant_updates > 3 THEN 80
      WHEN relevant_updates > 1 THEN 60
      WHEN days_since_update > 180 THEN 50
      WHEN days_since_update > 90 THEN 30
      ELSE 10
    END as urgency_score,
    CASE
      WHEN relevant_updates > 3 THEN 'critical'
      WHEN relevant_updates > 1 OR days_since_update > 180 THEN 'high'
      WHEN days_since_update > 90 THEN 'medium'
      ELSE 'low'
    END as status
  FROM (
    SELECT * FROM module_update_ages
    UNION ALL
    SELECT * FROM faq_update_ages
  ) as content
  WHERE relevant_updates > 0 OR days_since_update > 60
  ORDER BY urgency_score DESC, relevant_updates DESC;
END;
$$;

-- Enable RLS
ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_review_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view active images"
ON image_assets FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admins can manage images"
ON image_assets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view regulatory content"
ON regulatory_content FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view regulatory updates"
ON regulatory_updates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage content review queue"
ON content_review_queue FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update trigger for content_review_queue
CREATE TRIGGER update_content_review_queue_updated_at
BEFORE UPDATE ON content_review_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();