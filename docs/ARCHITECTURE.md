# System Architecture Documentation

## 🏗 Overview

The Cannabis Education Platform is built as a modern web application with a React frontend and Supabase backend, designed for scalability, security, and compliance with state regulations.

## 🔧 Technology Stack

### Frontend Layer
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom design system tokens
- **State Management**: React Context API + React Query for server state
- **Routing**: React Router DOM v6
- **UI Components**: Custom component library built on Radix UI primitives

### Backend Layer
- **Database**: PostgreSQL via Supabase
- **API**: Supabase Edge Functions (Deno runtime)
- **Authentication**: Supabase Auth with JWT tokens
- **Security**: Row-Level Security (RLS) policies
- **File Storage**: Supabase Storage (for certificates and documents)

### External Services
- **Payment Processing**: PayPal REST API
- **Email Service**: Resend API for transactional emails
- **SMS/Voice**: Vonage API for multi-factor authentication
- **PDF Generation**: jsPDF for certificate creation
- **AI Services**: OpenAI API for chat assistance

## 🗃 Database Schema

### Core Tables

#### User Management
```sql
-- User profiles with extended information
profiles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  first_name text,
  last_name text,
  organization_id uuid REFERENCES organizations,
  dispensary_access_key text,
  -- Additional profile fields...
)

-- Role-based access control
user_roles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  role app_role -- ENUM: 'admin', 'dispensary_manager', 'student'
)

-- Multi-factor authentication preferences
user_verification_preferences (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  preferred_method text DEFAULT 'email',
  phone_number text,
  backup_method text
)
```

#### Course System
```sql
-- Course definitions
courses (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text,
  module_count integer DEFAULT 18,
  passing_score integer DEFAULT 80,
  price_cents integer DEFAULT 4999,
  is_active boolean DEFAULT true
)

-- Individual course modules
course_modules (
  id uuid PRIMARY KEY,
  course_id uuid REFERENCES courses,
  module_number integer NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  content text,
  quiz_questions jsonb
)

-- Student progress tracking
user_progress (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  course_id uuid REFERENCES courses,
  module_id uuid REFERENCES course_modules,
  is_completed boolean DEFAULT false,
  score integer,
  completed_at timestamp with time zone
)

-- Exam attempts and scores
exam_attempts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  course_id uuid REFERENCES courses,
  total_score integer,
  is_passed boolean DEFAULT false,
  attempt_number integer DEFAULT 1,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  photo_verification_url text
)
```

#### Organization Management
```sql
-- Dispensary organizations
organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  contact_email text,
  unique_access_key text UNIQUE,
  course_credits integer DEFAULT 0,
  admin_approved boolean DEFAULT false,
  payment_status text DEFAULT 'pending'
)

-- Dispensary applications (before approval)
dispensary_applications (
  id uuid PRIMARY KEY,
  organization_name text NOT NULL,
  contact_person text NOT NULL,
  contact_email text NOT NULL,
  license_number text,
  application_status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users,
  admin_notes text
)

-- Staff invitation system
staff_invitations (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  email text NOT NULL,
  role text DEFAULT 'student',
  invitation_token text UNIQUE,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone
)
```

#### Certification & Compliance
```sql
-- Generated certificates
certificates (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  course_id uuid REFERENCES courses,
  exam_attempt_id uuid REFERENCES exam_attempts,
  certificate_number text UNIQUE,
  issue_date timestamp with time zone DEFAULT now(),
  expiry_date timestamp with time zone,
  is_revoked boolean DEFAULT false,
  pdf_url text
)

-- Compliance metrics and reporting
compliance_metrics (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  compliance_score numeric,
  risk_level text DEFAULT 'low',
  calculation_date date DEFAULT CURRENT_DATE
)
```

#### Security & Audit
```sql
-- Security event logging
security_events (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  event_type text NOT NULL,
  severity text DEFAULT 'low',
  details jsonb DEFAULT '{}',
  source_ip text,
  user_agent text,
  resolved_at timestamp with time zone
)

-- Comprehensive audit trail
security_audit_log (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  table_name text NOT NULL,
  action_type text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text
)

-- Rate limiting for security
rate_limits (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  action_type text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone
)
```

### Key Database Functions

#### User Management
- `has_role(user_id, role)` - Check if user has specific role
- `handle_new_user()` - Trigger for new user profile creation
- `manage_user_role(user_id, role, action)` - Add/remove user roles

#### Organization Management
- `approve_dispensary_application(id, credits)` - Approve and create organization
- `reject_dispensary_application(id, reason)` - Reject application
- `create_test_organization(name, email, credits)` - Create test organization
- `get_organization_employees(org_id)` - Retrieve organization staff

#### Security & Compliance
- `check_rate_limit(user_id, action, max_requests, window)` - Rate limiting
- `log_security_event(type, details)` - Log security events
- `verify_certificate_status(cert_number)` - Certificate verification
- `calculate_compliance_score(org_id)` - Calculate organization compliance
- `generate_compliance_report(org_id)` - Generate compliance reports

## 🔐 Security Architecture

### Row-Level Security (RLS) Policies

#### User Data Protection
```sql
-- Users can only access their own data
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admin access to all data
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

#### Organization Data Access
```sql
-- Organization members can view their organization
CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND organization_id = organizations.id
  )
);

-- Dispensary managers can manage their organization's staff
CREATE POLICY "Managers can view org employees"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'dispensary_manager'
    AND p.organization_id = profiles.organization_id
  )
);
```

### Authentication Flow
1. **User Registration**: Email + password or social providers
2. **Profile Creation**: Automatic profile creation via trigger
3. **Role Assignment**: Default 'student' role, upgradeable by admins
4. **MFA Setup**: Optional phone/email verification setup
5. **Organization Linking**: Via dispensary access key or invitation

### Data Encryption
- **At Rest**: PostgreSQL encryption + Supabase managed encryption
- **In Transit**: TLS 1.3 for all API communications
- **Sensitive Data**: Additional encryption for PII and payment data

## 🌐 Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── ui/                 # Base UI components (buttons, forms, etc.)
│   ├── auth/              # Authentication components
│   ├── course/            # Course-related components
│   ├── admin/             # Admin dashboard components
│   ├── communication/     # Messaging and notification components
│   └── layout/            # Layout and navigation components
├── pages/                 # Route-level page components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
└── integrations/          # External service integrations
```

### State Management Strategy
- **Authentication State**: React Context (`AuthProvider`)
- **Server State**: React Query for API data fetching and caching
- **UI State**: Local component state with useState/useReducer
- **Global UI State**: React Context for themes, notifications

### Routing Structure
```
/                          # Landing page
/auth                      # Authentication (login/register)
/dashboard                 # Student dashboard
/course/:moduleId          # Course module pages
/profile                   # User profile management
/dispensary                # Dispensary manager portal
/admin                     # Admin dashboard
/certificates              # Certificate management
/faq                       # FAQ and help
```

## 🔄 Data Flow Patterns

### Course Completion Flow
1. **Module Start**: Update user_progress with started_at timestamp
2. **Content Consumption**: Track time_spent and engagement metrics
3. **Quiz Completion**: Record scores and completion status
4. **Progress Update**: Update module completion in user_progress
5. **Course Completion**: Trigger exam eligibility check
6. **Final Exam**: Record attempt in exam_attempts table
7. **Certificate Generation**: Auto-generate on passing score

### Organization Onboarding Flow
1. **Application Submission**: Create dispensary_applications record
2. **Admin Review**: Update application_status and admin_notes
3. **Approval Process**: Execute approve_dispensary_application function
4. **Organization Creation**: Generate unique access key and setup
5. **Manager Setup**: Create manager account and assign role
6. **Staff Invitations**: Send invitation tokens to employees
7. **Employee Registration**: Link employees to organization

### Compliance Reporting Flow
1. **Data Collection**: Aggregate training completion and certificates
2. **Score Calculation**: Execute calculate_compliance_score function
3. **Metric Storage**: Store results in compliance_metrics table
4. **Report Generation**: Create exportable compliance reports
5. **Alert System**: Trigger notifications for compliance issues

## 🚀 Deployment Architecture

### Environment Configuration
- **Development**: Local Supabase instance with seeded data
- **Staging**: Cloud Supabase with production-like data
- **Production**: Fully managed Supabase with backup strategies

### CI/CD Pipeline
1. **Code Push**: Triggers automated testing
2. **Database Migrations**: Auto-apply via Supabase CLI
3. **Edge Function Deployment**: Automatic deployment on push
4. **Frontend Build**: Vite production build and deployment
5. **Health Checks**: Automated smoke tests post-deployment

### Monitoring & Observability
- **Application Metrics**: Performance monitoring via Supabase dashboard
- **Error Tracking**: Comprehensive error logging and alerting
- **Security Monitoring**: Real-time security event detection
- **User Analytics**: Training completion and engagement metrics

## 📊 Performance Considerations

### Database Optimization
- **Indexing Strategy**: Composite indexes on frequently queried columns
- **Query Optimization**: Efficient RLS policies and join strategies
- **Connection Pooling**: Supabase managed connection pooling
- **Caching Layer**: React Query for client-side caching

### Frontend Performance
- **Code Splitting**: Route-based code splitting with React.lazy
- **Asset Optimization**: Vite-powered asset bundling and compression
- **Image Optimization**: Lazy loading and responsive images
- **Bundle Analysis**: Regular bundle size monitoring and optimization

### Scalability Planning
- **Horizontal Scaling**: Supabase auto-scaling for database and APIs
- **CDN Strategy**: Global content delivery for static assets
- **Load Balancing**: Supabase managed load balancing
- **Capacity Planning**: Monitoring and alerting for resource usage

This architecture provides a solid foundation for a secure, scalable, and compliant cannabis education platform.