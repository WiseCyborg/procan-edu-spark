-- Add tier system to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tier_status TEXT DEFAULT 'green' 
CHECK (tier_status IN ('green', 'yellow', 'red'));

-- Add stoplight_tier to course_modules table
ALTER TABLE public.course_modules 
ADD COLUMN IF NOT EXISTS stoplight_tier TEXT DEFAULT 'green' 
CHECK (stoplight_tier IN ('green', 'yellow', 'red'));

-- Update modules 1-6 as Green, 7-12 as Yellow, 13-18 as Red
UPDATE public.course_modules 
SET stoplight_tier = CASE 
  WHEN module_number BETWEEN 1 AND 6 THEN 'green'
  WHEN module_number BETWEEN 7 AND 12 THEN 'yellow'
  WHEN module_number BETWEEN 13 AND 18 THEN 'red'
  ELSE 'green'
END;

-- Add tier_badge to certificates table
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS tier_badge TEXT DEFAULT 'red';

-- Create live_sessions table
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  host_name TEXT NOT NULL,
  host_bio TEXT,
  session_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_attendees INTEGER DEFAULT 50,
  zoom_link TEXT,
  session_type TEXT DEFAULT 'workshop' CHECK (session_type IN ('workshop', 'q_and_a', 'compliance_chat', 'best_practices')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create live_session_registrations table
CREATE TABLE IF NOT EXISTS public.live_session_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT now(),
  attended BOOLEAN DEFAULT false,
  UNIQUE(session_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_sessions
CREATE POLICY "Anyone can view active live sessions"
ON public.live_sessions FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage live sessions"
ON public.live_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for live_session_registrations
CREATE POLICY "Authenticated users can register for sessions"
ON public.live_session_registrations FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their registrations"
ON public.live_session_registrations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage registrations"
ON public.live_session_registrations FOR ALL
USING (has_role(auth.uid(), 'admin'));