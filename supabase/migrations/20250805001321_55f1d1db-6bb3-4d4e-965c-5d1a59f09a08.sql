-- Create user profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  organization TEXT,
  job_title TEXT,
  mca_registration_number TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organizations table for bulk enrollments
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  module_count INTEGER DEFAULT 18,
  passing_score INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course modules table
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  content TEXT,
  quiz_questions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, module_number)
);

-- Create user progress table
CREATE TABLE public.user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  score INTEGER,
  time_spent INTEGER DEFAULT 0, -- in seconds
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id, module_id)
);

-- Create exam attempts table
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  total_score INTEGER,
  passing_score INTEGER,
  is_passed BOOLEAN DEFAULT false,
  time_taken INTEGER, -- in seconds
  photo_verification_url TEXT,
  ip_address TEXT,
  attempt_number INTEGER DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  exam_attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT DEFAULT 'paypal',
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- welcome, certificate, reminder, etc.
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  provider_id TEXT, -- resend message id
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for courses (public read)
CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT USING (is_active = true);

-- Create RLS policies for course modules (public read)
CREATE POLICY "Anyone can view active course modules" ON public.course_modules
  FOR SELECT USING (is_active = true);

-- Create RLS policies for user progress
CREATE POLICY "Users can view their own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for exam attempts
CREATE POLICY "Users can view their own exam attempts" ON public.exam_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam attempts" ON public.exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for certificates
CREATE POLICY "Users can view their own certificates" ON public.certificates
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Create admin policies (will be implemented with role-based access later)
CREATE POLICY "Service role can manage all data" ON public.profiles
  FOR ALL USING (true);

CREATE POLICY "Service role can manage courses" ON public.courses
  FOR ALL USING (true);

CREATE POLICY "Service role can manage modules" ON public.course_modules
  FOR ALL USING (true);

CREATE POLICY "Service role can manage progress" ON public.user_progress
  FOR ALL USING (true);

CREATE POLICY "Service role can manage exams" ON public.exam_attempts
  FOR ALL USING (true);

CREATE POLICY "Service role can manage certificates" ON public.certificates
  FOR ALL USING (true);

CREATE POLICY "Service role can manage payments" ON public.payments
  FOR ALL USING (true);

CREATE POLICY "Service role can manage email logs" ON public.email_logs
  FOR ALL USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default course data
INSERT INTO public.courses (id, title, description, module_count, passing_score)
VALUES (
  gen_random_uuid(),
  'Maryland Responsible Vendor Training (RVT)',
  'Comprehensive cannabis compliance training for Maryland dispensary employees',
  18,
  80
);

-- Generate certificate number function
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  cert_number TEXT;
BEGIN
  cert_number := 'CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN cert_number;
END;
$$ LANGUAGE plpgsql;