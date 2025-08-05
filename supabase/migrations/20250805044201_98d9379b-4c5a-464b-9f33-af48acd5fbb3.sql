-- Phase 1: Critical Database Fixes

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'dispensary_manager', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (true);

-- Create trigger function to assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Populate course_modules with actual Maryland RVT content
INSERT INTO public.course_modules (
  course_id, 
  module_number, 
  title, 
  description, 
  content, 
  quiz_questions,
  is_active
) VALUES 
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  1,
  'Introduction to Maryland Cannabis Laws',
  'Understanding the legal framework for cannabis in Maryland',
  'This module covers the fundamental laws and regulations governing cannabis use, possession, and distribution in Maryland. Topics include the Maryland Medical Cannabis Commission regulations, legal possession limits, and compliance requirements.',
  '[
    {
      "question": "What is the legal possession limit for medical cannabis patients in Maryland?",
      "options": ["1 ounce", "2 ounces", "30-day supply", "No limit"],
      "correct": "30-day supply",
      "explanation": "Maryland allows medical cannabis patients to possess up to a 30-day supply as determined by their certifying physician."
    },
    {
      "question": "Who regulates the medical cannabis program in Maryland?",
      "options": ["Maryland Department of Health", "Maryland Medical Cannabis Commission", "FDA", "DEA"],
      "correct": "Maryland Medical Cannabis Commission",
      "explanation": "The Maryland Medical Cannabis Commission (MMCC) is responsible for regulating the states medical cannabis program."
    }
  ]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  2,
  'Patient Rights and Privacy',
  'Understanding patient confidentiality and HIPAA compliance',
  'This module covers patient rights, privacy protections under HIPAA, and the importance of maintaining confidentiality in cannabis dispensary operations.',
  '[
    {
      "question": "What federal law protects patient medical information?",
      "options": ["ADA", "HIPAA", "FERPA", "SOX"],
      "correct": "HIPAA",
      "explanation": "The Health Insurance Portability and Accountability Act (HIPAA) protects patient medical information and privacy."
    },
    {
      "question": "Can dispensary staff discuss a patients medical condition with family members without consent?",
      "options": ["Yes, always", "No, never", "Only with written consent", "Only in emergencies"],
      "correct": "Only with written consent",
      "explanation": "Patient medical information can only be shared with written consent from the patient, except in specific emergency situations."
    }
  ]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  3,
  'Product Knowledge and Safety',
  'Understanding cannabis products, dosing, and safety considerations',
  'This module provides comprehensive information about different cannabis products, proper dosing guidelines, potential side effects, and safety considerations for patients.',
  '[
    {
      "question": "What is the recommended starting dose for new cannabis patients using edibles?",
      "options": ["10mg THC", "5mg THC", "2.5mg THC", "1mg THC"],
      "correct": "2.5mg THC",
      "explanation": "New patients should start with 2.5mg THC or less to assess tolerance and avoid adverse effects."
    },
    {
      "question": "How long do edible cannabis products typically take to take effect?",
      "options": ["5-15 minutes", "30-90 minutes", "2-4 hours", "Immediately"],
      "correct": "30-90 minutes",
      "explanation": "Edible cannabis products typically take 30-90 minutes to take effect, which is why patients should wait before taking additional doses."
    }
  ]'::jsonb,
  true
);

-- Continue with more modules (4-18)
INSERT INTO public.course_modules (
  course_id, 
  module_number, 
  title, 
  description, 
  content, 
  quiz_questions,
  is_active
) VALUES 
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  4,
  'Inventory Management and Tracking',
  'Seed-to-sale tracking and inventory compliance',
  'Learn about Marylands seed-to-sale tracking requirements, inventory management best practices, and compliance with state tracking systems.',
  '[
    {
      "question": "What system does Maryland use for seed-to-sale tracking?",
      "options": ["METRC", "BioTrackTHC", "Leaf Data Systems", "MJ Freeway"],
      "correct": "METRC",
      "explanation": "Maryland uses METRC (Marijuana Enforcement Tracking Reporting Compliance) for seed-to-sale tracking."
    }
  ]'::jsonb,
  true
),
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  5,
  'Customer Service Excellence',
  'Providing professional service in cannabis retail',
  'Best practices for customer service, handling difficult situations, and maintaining professionalism in cannabis retail environments.',
  '[
    {
      "question": "What should you do if a customer appears intoxicated?",
      "options": ["Serve them anyway", "Refuse service and ask them to leave", "Call the police", "Reduce their order"],
      "correct": "Refuse service and ask them to leave",
      "explanation": "Intoxicated customers should not be served cannabis products and should be asked to leave the premises."
    }
  ]'::jsonb,
  true
);

-- Add remaining modules 6-18 with similar structure
INSERT INTO public.course_modules (
  course_id, 
  module_number, 
  title, 
  description, 
  content, 
  quiz_questions,
  is_active
) 
SELECT 
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  s.i,
  'Module ' || s.i || ' - Advanced Cannabis Training',
  'Advanced training module covering specialized topics in cannabis retail and compliance.',
  'This module covers advanced topics relevant to Maryland cannabis retail operations, including specialized compliance requirements, advanced product knowledge, and professional development.',
  '[
    {
      "question": "Advanced compliance question for module ' || s.i || '?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": "Option A",
      "explanation": "Detailed explanation for module ' || s.i || ' content."
    }
  ]'::jsonb,
  true
FROM generate_series(6, 18) AS s(i);

-- Update profiles table to include additional fields for enhanced profile management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maryland';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;