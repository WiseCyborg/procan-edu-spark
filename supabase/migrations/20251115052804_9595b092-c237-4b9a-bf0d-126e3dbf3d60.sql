
-- ============================================
-- PHASE 1: CRITICAL DATABASE & SECURITY FIXES
-- MCA Preview Readiness - Nov 15, 2025
-- ============================================

-- ============================================
-- 1. FIX SECURITY DEFINER VIEW ERRORS (5 views)
-- Add security_invoker=true to all exam analytics views
-- ============================================

-- Drop and recreate views with security_invoker option
DROP VIEW IF EXISTS exam_analytics_overview CASCADE;
CREATE VIEW exam_analytics_overview WITH (security_invoker=true) AS
SELECT 
  count(*)::integer AS total_attempts,
  count(DISTINCT user_id)::integer AS unique_test_takers,
  count(*) FILTER (WHERE is_passed = true)::integer AS passed_attempts,
  count(*) FILTER (WHERE is_passed = false)::integer AS failed_attempts,
  round(avg(total_score), 2) AS average_score,
  round(avg(total_score) FILTER (WHERE is_passed = true), 2) AS average_passing_score,
  round(avg(total_score) FILTER (WHERE is_passed = false), 2) AS average_failing_score,
  round(count(*) FILTER (WHERE is_passed = true)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS overall_pass_rate,
  min(created_at) AS first_attempt_date,
  max(created_at) AS most_recent_attempt_date
FROM exam_attempts;

DROP VIEW IF EXISTS exam_difficulty_analysis CASCADE;
CREATE VIEW exam_difficulty_analysis WITH (security_invoker=true) AS
SELECT 
  ets.section_number,
  eb.section_title,
  eb.comar_section,
  CASE
    WHEN avg(ets.score_percentage) >= 85::numeric THEN 'easy'::text
    WHEN avg(ets.score_percentage) >= 70::numeric THEN 'medium'::text
    WHEN avg(ets.score_percentage) >= 60::numeric THEN 'hard'::text
    ELSE 'very_hard'::text
  END AS difficulty_level,
  round(avg(ets.score_percentage), 2) AS average_performance,
  count(*)::integer AS sample_size,
  round(count(*) FILTER (WHERE ets.score_percentage < 80)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS failure_rate
FROM exam_topic_scores ets
JOIN exam_blueprint eb ON eb.section_number = ets.section_number
GROUP BY ets.section_number, eb.section_title, eb.comar_section;

DROP VIEW IF EXISTS exam_monthly_trends CASCADE;
CREATE VIEW exam_monthly_trends WITH (security_invoker=true) AS
SELECT 
  to_char(created_at, 'YYYY-MM'::text) AS month,
  count(*)::integer AS total_attempts,
  count(*) FILTER (WHERE is_passed = true)::integer AS passed,
  count(*) FILTER (WHERE is_passed = false)::integer AS failed,
  round(avg(total_score), 2) AS avg_score,
  round(count(*) FILTER (WHERE is_passed = true)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS pass_rate
FROM exam_attempts
GROUP BY to_char(created_at, 'YYYY-MM'::text)
ORDER BY to_char(created_at, 'YYYY-MM'::text) DESC;

DROP VIEW IF EXISTS exam_struggling_sections CASCADE;
CREATE VIEW exam_struggling_sections WITH (security_invoker=true) AS
SELECT 
  ets.section_number,
  eb.section_title,
  eb.comar_section,
  eb.topic_area,
  count(*)::integer AS total_attempts,
  count(DISTINCT ea.user_id) FILTER (WHERE ets.score_percentage < 80)::integer AS students_struggling,
  round(count(DISTINCT ea.user_id) FILTER (WHERE ets.score_percentage < 80)::numeric / NULLIF(count(DISTINCT ea.user_id), 0)::numeric * 100::numeric, 2) AS struggle_rate,
  round(avg(ets.score_percentage), 2) AS average_score,
  round(avg(ets.score_percentage) FILTER (WHERE ets.score_percentage < 80), 2) AS avg_struggling_score
FROM exam_topic_scores ets
JOIN exam_blueprint eb ON eb.section_number = ets.section_number
JOIN exam_attempts ea ON ea.id = ets.exam_attempt_id
GROUP BY ets.section_number, eb.section_title, eb.comar_section, eb.topic_area
HAVING count(DISTINCT ea.user_id) FILTER (WHERE ets.score_percentage < 80) > 0;

DROP VIEW IF EXISTS exam_topic_analytics CASCADE;
CREATE VIEW exam_topic_analytics WITH (security_invoker=true) AS
SELECT 
  ets.section_number,
  eb.section_title,
  eb.comar_section,
  eb.topic_area,
  count(*)::integer AS total_attempts,
  round(avg(ets.score_percentage), 2) AS average_score,
  count(*) FILTER (WHERE ets.score_percentage >= 80)::integer AS passed_count,
  count(*) FILTER (WHERE ets.score_percentage < 80)::integer AS failed_count,
  round(count(*) FILTER (WHERE ets.score_percentage >= 80)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS pass_rate,
  min(ets.score_percentage) AS min_score,
  max(ets.score_percentage) AS max_score,
  percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY ets.score_percentage::double precision) AS median_score,
  round(stddev(ets.score_percentage), 2) AS score_std_dev,
  count(*) FILTER (WHERE ets.needs_remediation = true)::integer AS remediation_required_count
FROM exam_topic_scores ets
JOIN exam_blueprint eb ON eb.section_number = ets.section_number
GROUP BY ets.section_number, eb.section_title, eb.comar_section, eb.topic_area;

-- ============================================
-- 2. CREATE SEAT RECONCILIATION FUNCTION
-- Auto-generates missing seats and logs discrepancies
-- ============================================

CREATE OR REPLACE FUNCTION reconcile_seats()
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  purchased_quantity integer,
  actual_seats integer,
  seats_missing integer,
  seats_generated integer,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  expected_seats integer;
  current_seats integer;
  missing_seats integer;
  seats_to_create integer;
  new_seats integer := 0;
BEGIN
  -- Create temp table for results
  CREATE TEMP TABLE IF NOT EXISTS reconciliation_results (
    organization_id uuid,
    organization_name text,
    purchased_quantity integer,
    actual_seats integer,
    seats_missing integer,
    seats_generated integer,
    status text
  );

  -- Loop through all organizations with purchases
  FOR org_record IN 
    SELECT 
      o.id,
      o.name,
      COALESCE(SUM(rp.quantity), 0) as total_purchased
    FROM organizations o
    LEFT JOIN rvt_purchases rp ON rp.organization_id = o.id
    WHERE o.admin_approved = true
    GROUP BY o.id, o.name
  LOOP
    -- Count current seats
    SELECT COUNT(*) INTO current_seats
    FROM rvt_seats
    WHERE rvt_seats.organization_id = org_record.id;

    expected_seats := org_record.total_purchased;
    missing_seats := expected_seats - current_seats;

    IF missing_seats > 0 THEN
      -- Generate missing seats
      seats_to_create := missing_seats;
      new_seats := 0;

      -- Get course ID (Maryland RVT)
      DECLARE
        rvt_course_id uuid;
      BEGIN
        SELECT id INTO rvt_course_id
        FROM courses
        WHERE title ILIKE '%Maryland Responsible Vendor Training%'
        LIMIT 1;

        -- Create missing seats
        IF rvt_course_id IS NOT NULL THEN
          FOR i IN 1..seats_to_create LOOP
            INSERT INTO rvt_seats (
              organization_id,
              course_id,
              status,
              seat_type
            ) VALUES (
              org_record.id,
              rvt_course_id,
              'available',
              'standard'
            );
            new_seats := new_seats + 1;
          END LOOP;
        END IF;
      END;

      -- Log discrepancy
      INSERT INTO system_integrity_checks (
        check_type,
        severity,
        status,
        affected_entity_type,
        affected_entity_id,
        issue_description,
        suggested_fix,
        technical_details,
        auto_fixable,
        detected_at,
        metadata
      ) VALUES (
        'seat_count_mismatch',
        'medium',
        'resolved',
        'organization',
        org_record.id,
        format('Organization "%s" had %s missing training seats', org_record.name, missing_seats),
        format('Auto-generated %s seats to match purchase quantity', new_seats),
        jsonb_build_object(
          'organization_id', org_record.id,
          'purchased_quantity', expected_seats,
          'seats_before', current_seats,
          'seats_after', current_seats + new_seats,
          'seats_generated', new_seats
        ),
        true,
        NOW(),
        jsonb_build_object(
          'reconciliation_run', NOW(),
          'automated_fix', true
        )
      );

      INSERT INTO reconciliation_results VALUES (
        org_record.id,
        org_record.name,
        expected_seats,
        current_seats,
        missing_seats,
        new_seats,
        'FIXED'
      );
    ELSIF missing_seats < 0 THEN
      -- More seats than purchased (potential issue)
      INSERT INTO system_integrity_checks (
        check_type,
        severity,
        status,
        affected_entity_type,
        affected_entity_id,
        issue_description,
        suggested_fix,
        technical_details,
        auto_fixable,
        detected_at
      ) VALUES (
        'excess_seats',
        'low',
        'detected',
        'organization',
        org_record.id,
        format('Organization "%s" has %s more seats than purchased', org_record.name, ABS(missing_seats)),
        'Review purchase history and seat assignments',
        jsonb_build_object(
          'organization_id', org_record.id,
          'purchased_quantity', expected_seats,
          'actual_seats', current_seats,
          'excess_seats', ABS(missing_seats)
        ),
        false,
        NOW()
      );

      INSERT INTO reconciliation_results VALUES (
        org_record.id,
        org_record.name,
        expected_seats,
        current_seats,
        missing_seats,
        0,
        'EXCESS_SEATS'
      );
    ELSE
      -- Perfect match
      INSERT INTO reconciliation_results VALUES (
        org_record.id,
        org_record.name,
        expected_seats,
        current_seats,
        0,
        0,
        'OK'
      );
    END IF;
  END LOOP;

  -- Return results
  RETURN QUERY SELECT * FROM reconciliation_results;

  -- Clean up
  DROP TABLE IF EXISTS reconciliation_results;
END;
$$;

-- Add comment
COMMENT ON FUNCTION reconcile_seats() IS 'Reconciles training seats with purchase quantities. Auto-generates missing seats and logs discrepancies to system_integrity_checks table. Run periodically to maintain seat integrity.';

-- ============================================
-- 3. GRANT NECESSARY PERMISSIONS
-- ============================================

-- Allow service role to execute reconciliation
GRANT EXECUTE ON FUNCTION reconcile_seats() TO service_role;

-- Allow admins to view reconciliation results
GRANT SELECT ON system_integrity_checks TO authenticated;

-- ============================================
-- 4. RUN INITIAL RECONCILIATION
-- ============================================

-- Run reconciliation immediately to fix any existing issues
SELECT * FROM reconcile_seats();

-- ============================================
-- END OF PHASE 1 MIGRATION
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 migration completed successfully:';
  RAISE NOTICE '- Fixed 5 Security Definer View errors';
  RAISE NOTICE '- Created reconcile_seats() function';
  RAISE NOTICE '- Ran initial seat reconciliation';
  RAISE NOTICE '- Ready for Phase 2: Live Interactive Dashboards';
END $$;
