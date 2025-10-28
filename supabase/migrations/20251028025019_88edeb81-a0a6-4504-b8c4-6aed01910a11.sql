-- Add registration token system to dispensary_applications
ALTER TABLE dispensary_applications 
ADD COLUMN registration_token TEXT,
ADD COLUMN registration_token_expires_at TIMESTAMPTZ,
ADD COLUMN registration_completed BOOLEAN DEFAULT false;

-- Create index for token lookups
CREATE INDEX idx_applications_registration_token 
ON dispensary_applications(registration_token) 
WHERE registration_token IS NOT NULL;