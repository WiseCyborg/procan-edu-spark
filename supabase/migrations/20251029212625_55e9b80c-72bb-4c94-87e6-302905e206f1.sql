-- Phase 5: Database Trigger for Automatic Welcome Email (Fixed)
-- This trigger sends a welcome email when a manager completes registration

CREATE OR REPLACE FUNCTION trigger_manager_welcome()
RETURNS TRIGGER AS $$
DECLARE
  base_url TEXT := 'https://www.procannedu.com';
BEGIN
  -- When manager completes registration
  IF NEW.registration_completed = true AND (OLD.registration_completed IS NULL OR OLD.registration_completed = false) THEN
    -- Queue welcome email with onboarding CTA
    INSERT INTO notification_queue (
      recipient_email,
      subject,
      message,
      scheduled_for,
      priority,
      metadata
    ) VALUES (
      NEW.contact_email,
      'Welcome to ProCann Edu - Set Up Your Team',
      'Dear ' || COALESCE(NEW.contact_person, 'Manager') || 
      E',\n\nCongratulations on completing your registration!' ||
      E'\n\nYour next step is to set up your training team. Click the link below to:' ||
      E'\n• Designate a Training Coordinator' ||
      E'\n• Invite your employees to the training program' ||
      E'\n• Start tracking compliance' ||
      E'\n\nGet Started: ' || base_url || '/onboarding/setup-team' ||
      E'\n\nIf you have any questions, our support team is here to help.' ||
      E'\n\nBest regards,' ||
      E'\nProCann Edu Team',
      NOW(),
      'high',
      jsonb_build_object(
        'application_id', NEW.id,
        'action_required', 'setup_team',
        'cta_url', base_url || '/onboarding/setup-team'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on dispensary_applications
DROP TRIGGER IF EXISTS on_manager_registration_complete ON dispensary_applications;

CREATE TRIGGER on_manager_registration_complete
  AFTER UPDATE ON dispensary_applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_manager_welcome();

COMMENT ON FUNCTION trigger_manager_welcome() IS 'Sends welcome email with onboarding link when manager completes registration';