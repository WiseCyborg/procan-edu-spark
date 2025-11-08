-- Phase 1: Database Schema Changes for Consumer Education Track

-- Step 1: Extend courses table with consumer-specific fields
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS course_type text DEFAULT 'professional' 
CHECK (course_type IN ('professional', 'consumer', 'public'));

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS target_audience text;

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS completion_badge_name text;

-- Step 2: Add 'consumer' role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'consumer';

-- Step 3: Update RLS policies for public course access
-- Allow anyone to view public courses
DROP POLICY IF EXISTS "Public courses are viewable by everyone" ON courses;
CREATE POLICY "Public courses are viewable by everyone"
ON courses FOR SELECT
USING (is_public = true OR auth.uid() IS NOT NULL);

-- Allow anyone to view modules for public courses
DROP POLICY IF EXISTS "Public course modules are viewable by everyone" ON course_modules;
CREATE POLICY "Public course modules are viewable by everyone"
ON course_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_modules.course_id 
    AND courses.is_public = true
  )
  OR auth.uid() IS NOT NULL
);

-- Step 4: Create consumer_enrollments table for guest user tracking
CREATE TABLE IF NOT EXISTS consumer_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  email text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_or_session_required CHECK (
    user_id IS NOT NULL OR session_id IS NOT NULL
  )
);

-- Enable RLS on consumer_enrollments
ALTER TABLE consumer_enrollments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own enrollments
CREATE POLICY "Users can view their own consumer enrollments"
ON consumer_enrollments FOR SELECT
USING (
  auth.uid() = user_id 
  OR session_id IS NOT NULL
);

-- Allow users to insert their own enrollments
CREATE POLICY "Users can create consumer enrollments"
ON consumer_enrollments FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR user_id IS NULL
);

-- Allow users to update their own enrollments
CREATE POLICY "Users can update their own consumer enrollments"
ON consumer_enrollments FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (user_id IS NULL AND session_id IS NOT NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consumer_enrollments_user_id ON consumer_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_consumer_enrollments_session_id ON consumer_enrollments(session_id);
CREATE INDEX IF NOT EXISTS idx_consumer_enrollments_course_id ON consumer_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);
CREATE INDEX IF NOT EXISTS idx_courses_is_public ON courses(is_public);

-- Add trigger for updated_at
CREATE TRIGGER update_consumer_enrollments_updated_at
BEFORE UPDATE ON consumer_enrollments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE consumer_enrollments IS 'Tracks consumer course enrollments for both authenticated users and guest sessions';
COMMENT ON COLUMN courses.course_type IS 'Type of course: professional (compliance training), consumer (public education), or public (general access)';
COMMENT ON COLUMN courses.is_public IS 'Whether the course can be accessed without authentication';
COMMENT ON COLUMN courses.target_audience IS 'Description of the intended audience for the course';
COMMENT ON COLUMN courses.completion_badge_name IS 'Name of the badge/certificate earned upon completion';