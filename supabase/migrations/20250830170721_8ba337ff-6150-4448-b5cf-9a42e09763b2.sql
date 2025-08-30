-- Evolve email_verification_codes table to support multi-channel verification
ALTER TABLE public.email_verification_codes 
  ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS vonage_request_id TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER DEFAULT 0;

-- Add index for vonage_request_id lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_vonage_request_id 
  ON public.email_verification_codes(vonage_request_id);

-- Create user_verification_preferences table
CREATE TABLE IF NOT EXISTS public.user_verification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preferred_method TEXT DEFAULT 'email',
  phone_number TEXT,
  backup_method TEXT DEFAULT 'email',
  last_successful_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on verification preferences
ALTER TABLE public.user_verification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for verification preferences
CREATE POLICY "Users can manage their own verification preferences" 
ON public.user_verification_preferences 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage verification preferences" 
ON public.user_verification_preferences 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_user_verification_preferences_updated_at
BEFORE UPDATE ON public.user_verification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update profiles table to ensure phone number support
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_method_preference TEXT DEFAULT 'email';