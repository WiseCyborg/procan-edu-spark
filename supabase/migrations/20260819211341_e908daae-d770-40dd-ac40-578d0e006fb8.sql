-- 1) Restrict payment provider identifiers on courses to service_role only
REVOKE SELECT ON public.courses FROM authenticated;
GRANT SELECT (
  id, title, description, module_count, passing_score, is_active, created_at, updated_at,
  price_cents, currency, payment_required, course_type, is_public, target_audience,
  completion_badge_name, prerequisite_course_id, prerequisite_required, max_exam_attempts
) ON public.courses TO authenticated;
GRANT SELECT ON public.courses TO service_role;

-- 2) Force system-controlled columns on public dispensary application submissions
CREATE OR REPLACE FUNCTION public.enforce_dispensary_application_intake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and backend services may set any field
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.application_status := 'pending';
  NEW.payment_status := 'pending';
  NEW.payment_provider := NULL;
  NEW.payment_amount := NULL;
  NEW.payment_transaction_id := NULL;
  NEW.payment_date := NULL;
  NEW.admin_notes := NULL;
  NEW.organization_id := NULL;
  NEW.dispensary_number := NULL;
  NEW.registration_token := NULL;
  NEW.registration_token_hash := NULL;
  NEW.registration_token_expires_at := NULL;
  NEW.registration_completed := false;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_dispensary_application_intake_trg ON public.dispensary_applications;
CREATE TRIGGER enforce_dispensary_application_intake_trg
BEFORE INSERT ON public.dispensary_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_dispensary_application_intake();