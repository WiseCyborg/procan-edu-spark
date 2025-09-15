# API Reference & Database Documentation

## 🔌 Overview

This document provides comprehensive technical documentation for the Cannabis Education Platform's database schema, API endpoints, and integration patterns.

## 🗃 Database Schema Reference

### Core Database Types

#### Custom Enums
```sql
-- User role definitions
CREATE TYPE app_role AS ENUM (
  'admin',              -- System administrators
  'dispensary_manager', -- Organization managers
  'student'            -- Training participants
);
```

### User Management Tables

#### `profiles` Table
Core user profile information and organizational linking.

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  address text,
  city text,
  state text DEFAULT 'Maryland',
  zip_code text,
  organization_id uuid REFERENCES organizations(id),
  dispensary_access_key text,
  job_title text,
  mca_registration_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  profile_photo_url text,
  is_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  verification_method_preference text DEFAULT 'email',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

#### `user_roles` Table
Role-based access control management.

```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- RLS Policies
CREATE POLICY "Users can view only their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all user roles" ON user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));
```

### Course Management Tables

#### `courses` Table
Course definitions and configuration.

```sql
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  module_count integer DEFAULT 18,
  passing_score integer DEFAULT 80,
  price_cents integer DEFAULT 4999,
  currency text DEFAULT 'usd',
  payment_required boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Authenticated users can view full course details" ON courses
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);
CREATE POLICY "Unauthenticated users can view basic course info" ON courses
  FOR SELECT USING (is_active = true AND auth.uid() IS NULL);
```

#### `course_modules` Table
Individual training modules within courses.

```sql
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_number integer NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  content text,
  quiz_questions jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Quiz Questions JSON Structure
{
  "questions": [
    {
      "id": "q1",
      "question": "What is the legal age for cannabis consumption in Maryland?",
      "type": "multiple_choice",
      "options": ["18", "19", "20", "21"],
      "correct_answer": "21",
      "explanation": "The legal age for cannabis consumption in Maryland is 21 years old."
    }
  ]
}
```

#### `user_progress` Table
Student progress tracking through courses and modules.

```sql
CREATE TABLE public.user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  score integer,
  time_spent integer DEFAULT 0, -- in seconds
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);
```

### Organization Management Tables

#### `organizations` Table
Dispensary organization records.

```sql
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  contact_email text,
  contact_phone text,
  address text,
  license_number text,
  unique_access_key text UNIQUE,
  course_credits integer DEFAULT 0,
  admin_approved boolean DEFAULT false,
  payment_status text DEFAULT 'pending', -- 'pending', 'paid', 'approved', 'test'
  is_active boolean DEFAULT true,
  stripe_session_id text,
  stripe_customer_id text,
  paypal_order_id text,
  paypal_payer_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Authenticated users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND organization_id = organizations.id
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'dispensary_manager'
      AND p.organization_id = organizations.id
    )
  );
```

#### `dispensary_applications` Table
Dispensary application submissions before approval.

```sql
CREATE TABLE public.dispensary_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  contact_person text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  address text,
  license_number text,
  requested_credits integer DEFAULT 10,
  application_status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Public can submit dispensary applications" ON dispensary_applications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all dispensary applications" ON dispensary_applications
  FOR ALL USING (has_role(auth.uid(), 'admin'));
```

### Certification and Compliance Tables

#### `certificates` Table
Generated training certificates.

```sql
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  exam_attempt_id uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  issue_date timestamp with time zone DEFAULT now(),
  expiry_date timestamp with time zone,
  is_revoked boolean DEFAULT false,
  pdf_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Users can view their own certificates" ON certificates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all certificates" ON certificates
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

#### `exam_attempts` Table
Final exam attempt records with proctoring.

```sql
CREATE TABLE public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  total_score integer,
  passing_score integer DEFAULT 80,
  is_passed boolean DEFAULT false,
  time_taken integer, -- in seconds
  attempt_number integer DEFAULT 1,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  photo_verification_url text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Users can view their own exam attempts" ON exam_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exam attempts" ON exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Security and Audit Tables

#### `security_audit_log` Table
Comprehensive audit trail for all system activities.

```sql
CREATE TABLE public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  table_name text NOT NULL,
  action_type text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
CREATE POLICY "Admins can view audit logs" ON security_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert audit logs" ON security_audit_log
  FOR INSERT WITH CHECK (current_setting('role') = 'service_role');
```

#### `security_events` Table
Security incident tracking and monitoring.

```sql
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id),
  event_type text NOT NULL,
  severity text DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  details jsonb DEFAULT '{}',
  source_ip text,
  user_agent text,
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Common Event Types
-- 'login_failed', 'mfa_failed', 'suspicious_activity', 'data_breach_attempt'
-- 'rate_limit_exceeded', 'privilege_escalation', 'certificate_fraud'
```

## 🔧 Database Functions Reference

### User Management Functions

#### `has_role(user_id, role)`
Check if a user has a specific role. Used extensively in RLS policies.

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Usage Example
SELECT has_role(auth.uid(), 'admin'); -- Returns true if user is admin
```

#### `manage_user_role(user_id, role, action)`
Add or remove user roles with admin permission checking.

```sql
-- Add admin role to user
SELECT * FROM manage_user_role(
  'user-uuid-here'::uuid, 
  'admin'::app_role, 
  'add'
);

-- Remove role from user
SELECT * FROM manage_user_role(
  'user-uuid-here'::uuid, 
  'dispensary_manager'::app_role, 
  'remove'
);
```

### Organization Management Functions

#### `approve_dispensary_application(application_id, credits)`
Approve pending application and create organization.

```sql
-- Approve application with default 10 credits
SELECT * FROM approve_dispensary_application(
  'application-uuid-here'::uuid,
  10
);

-- Returns: success boolean, message text, organization_id uuid, access_key text
```

#### `reject_dispensary_application(application_id, reason)`
Reject pending application with reason.

```sql
SELECT * FROM reject_dispensary_application(
  'application-uuid-here'::uuid,
  'Incomplete license documentation'
);
```

#### `create_test_organization(name, email, credits)`
Create test organization for development/demo purposes.

```sql
SELECT * FROM create_test_organization(
  'Test Dispensary LLC',
  'test@example.com',
  50
);
```

### Security Functions

#### `check_rate_limit(user_id, action, max_requests, window_minutes)`
Rate limiting for security-sensitive operations.

```sql
-- Check if user can perform certificate generation (max 5 per hour)
SELECT check_rate_limit(
  auth.uid(),
  'certificate_generation',
  5,
  60
);
```

#### `log_security_event(event_type, details)`
Log security events for monitoring and audit.

```sql
-- Log failed login attempt
SELECT log_security_event(
  'login_failed',
  '{"ip_address": "192.168.1.1", "user_agent": "Mozilla/5.0..."}'::jsonb
);
```

### Compliance Functions

#### `calculate_compliance_score(organization_id)`
Calculate organization compliance score (0-100).

```sql
SELECT calculate_compliance_score('org-uuid-here'::uuid);
-- Returns numeric score based on training completion and certificate status
```

#### `generate_compliance_report(organization_id)`
Generate comprehensive compliance report.

```sql
-- Generate report for specific organization
SELECT * FROM generate_compliance_report('org-uuid-here'::uuid);

-- Generate report for all organizations
SELECT * FROM generate_compliance_report(NULL);
```

## 🌐 Edge Functions Reference

### Authentication Functions

#### `vonage-verify-start`
Initiate SMS/voice verification via Vonage API.

```typescript
// POST /functions/v1/vonage-verify-start
{
  "phone_number": "+15551234567",
  "brand": "Cannabis Education Platform"
}

// Response
{
  "success": true,
  "request_id": "vonage-request-id",
  "message": "Verification code sent"
}
```

#### `vonage-verify-check`
Verify SMS/voice code via Vonage API.

```typescript
// POST /functions/v1/vonage-verify-check
{
  "request_id": "vonage-request-id",
  "code": "123456"
}

// Response
{
  "success": true,
  "status": "verified",
  "message": "Code verified successfully"
}
```

### Payment Functions

#### `create-course-payment`
Create Stripe payment session for course purchase.

```typescript
// POST /functions/v1/create-course-payment
{
  "course_id": "course-uuid",
  "user_id": "user-uuid",
  "success_url": "https://app.com/success",
  "cancel_url": "https://app.com/cancel"
}

// Response
{
  "success": true,
  "session_id": "cs_stripe_session_id",
  "url": "https://checkout.stripe.com/..."
}
```

#### `verify-payment`
Verify and process completed payment.

```typescript
// POST /functions/v1/verify-payment
{
  "session_id": "cs_stripe_session_id"
}

// Response
{
  "success": true,
  "order_id": "order-uuid",
  "status": "completed"
}
```

### Communication Functions

#### `send-welcome-email`
Send welcome email to new users.

```typescript
// POST /functions/v1/send-welcome-email
{
  "email": "user@example.com",
  "first_name": "John",
  "organization_name": "Test Dispensary"
}
```

#### `send-certificate-email`
Send certificate completion email.

```typescript
// POST /functions/v1/send-certificate-email
{
  "email": "user@example.com",
  "certificate_number": "CERT-2024-001-1234",
  "course_title": "Maryland RVT Training"
}
```

### AI and Assistance Functions

#### `chat-assistant`
AI-powered chat assistance for training questions.

```typescript
// POST /functions/v1/chat-assistant
{
  "message": "What are the cannabis storage requirements?",
  "context": "course_module_5",
  "user_id": "user-uuid"
}

// Response
{
  "success": true,
  "response": "Cannabis storage requirements include...",
  "sources": ["module_5", "regulation_xyz"]
}
```

#### `text-to-voice`
Convert text to speech for accessibility.

```typescript
// POST /functions/v1/text-to-voice
{
  "text": "Welcome to Module 1: Cannabis Law and Regulations",
  "voice_id": "default",
  "user_id": "user-uuid"
}

// Response
{
  "success": true,
  "audio_url": "https://storage.url/audio-file.mp3"
}
```

### Certificate Functions

#### `generate-certificate`
Generate PDF certificate upon course completion.

```typescript
// POST /functions/v1/generate-certificate
{
  "user_id": "user-uuid",
  "course_id": "course-uuid",
  "exam_attempt_id": "attempt-uuid"
}

// Response
{
  "success": true,
  "certificate_id": "cert-uuid",
  "certificate_number": "CERT-2024-001-1234",
  "pdf_url": "https://storage.url/certificate.pdf"
}
```

## 🔐 Security Considerations

### Row-Level Security (RLS)
All tables implement comprehensive RLS policies:
- Users can only access their own data
- Organization managers can access their organization's data
- Admins have full system access
- Service role has automated access for system functions

### API Security
- All Edge Functions require authentication unless explicitly public
- Rate limiting implemented for security-sensitive operations
- Comprehensive audit logging for all data modifications
- Input validation and sanitization for all user inputs

### Data Privacy
- PII encryption for sensitive data
- Automatic data retention policies
- GDPR compliance for data subject requests
- Secure deletion procedures for account termination

### Compliance Monitoring
- Real-time security event monitoring
- Automated compliance score calculation
- Regulatory reporting capabilities
- Audit trail maintenance for all system activities

This API reference provides the foundation for understanding and integrating with the Cannabis Education Platform's backend systems.