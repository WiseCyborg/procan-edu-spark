-- Populate email templates table with all email templates
-- This ensures edge functions can load templates from database

-- Welcome Email Template
INSERT INTO public.email_templates (template_name, subject_line, html_content, is_active) VALUES (
  'welcome',
  'Welcome to ProCann Edu! 🎓',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ProCann Edu</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; color: #4a4a4a; }
    .button { display: inline-block; background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Welcome to ProCann Edu!</h1></div>
    <div class="content">
      <h2>Welcome, {{ .FirstName }}!</h2>
      <p>Thank you for joining ProCann Edu. Your account is now active.</p>
      <a href="{{ .DashboardURL }}" class="button">Access Your Dashboard</a>
    </div>
    <div class="footer"><p>© 2025 ProCann Edu. All rights reserved.</p></div>
  </div>
</body>
</html>',
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  subject_line = EXCLUDED.subject_line,
  updated_at = NOW();

-- Certificate Email Template
INSERT INTO public.email_templates (template_name, subject_line, html_content, is_active) VALUES (
  'certificate',
  '🎓 Your {{ .CourseTitle }} Certificate is Ready!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
    <h1 style="color: #16a34a; margin-bottom: 20px;">Congratulations, {{ .FirstName }} {{ .LastName }}!</h1>
    <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a;">
      You have successfully completed the <strong>{{ .CourseTitle }}</strong> course.
    </p>
    <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Certificate Number:</strong> {{ .CertificateNumber }}</p>
      <p style="margin: 5px 0;"><strong>Issue Date:</strong> {{ .IssueDate }}</p>
      <p style="margin: 5px 0;"><strong>Expiry Date:</strong> {{ .ExpiryDate }}</p>
    </div>
    <a href="{{ .CertificateURL }}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
      View & Download Certificate
    </a>
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Keep this certificate in a safe place. You may need to present it for verification purposes.
    </p>
  </div>
</body>
</html>',
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  subject_line = EXCLUDED.subject_line,
  updated_at = NOW();

-- Payment Confirmation Template
INSERT INTO public.email_templates (template_name, subject_line, html_content, is_active) VALUES (
  'payment-confirmation',
  '✅ Payment Confirmed - ProCann Edu',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px;">
    <h1 style="color: #16a34a;">Payment Confirmed</h1>
    <p>Thank you for your payment! Your course access is now active.</p>
    <div style="background: #f9fafb; padding: 15px; margin: 20px 0;">
      <p><strong>Amount:</strong> ${{ .Amount }}</p>
      <p><strong>Course:</strong> {{ .CourseName }}</p>
    </div>
    <a href="{{ .CourseURL }}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none;">
      Start Your Course
    </a>
  </div>
</body>
</html>',
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  subject_line = EXCLUDED.subject_line,
  updated_at = NOW();

-- Seat Purchase Confirmation Template  
INSERT INTO public.email_templates (template_name, subject_line, html_content, is_active) VALUES (
  'seat-purchase-confirmation',
  '✅ Seat Purchase Confirmed - ProCann Edu',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px;">
    <h1 style="color: #16a34a;">Seat Purchase Confirmed</h1>
    <p>Your organization now has {{ .TotalSeats }} training seats available.</p>
    <div style="background: #f9fafb; padding: 15px; margin: 20px 0;">
      <p><strong>Seats Purchased:</strong> {{ .SeatsPurchased }}</p>
      <p><strong>Amount Paid:</strong> ${{ .Amount }}</p>
    </div>
    <a href="{{ .DashboardURL }}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none;">
      Manage Seats
    </a>
  </div>
</body>
</html>',
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  subject_line = EXCLUDED.subject_line,
  updated_at = NOW();

-- Application Approved Template
INSERT INTO public.email_templates (template_name, subject_line, html_content, is_active) VALUES (
  'application-approved',
  '✅ Your Dispensary Application Has Been Approved',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px;">
    <h1 style="color: #16a34a;">Application Approved!</h1>
    <p>Congratulations! Your dispensary application has been approved.</p>
    <div style="background: #f9fafb; padding: 15px; margin: 20px 0;">
      <p><strong>Organization:</strong> {{ .OrganizationName }}</p>
      <p><strong>Access Key:</strong> {{ .AccessKey }}</p>
    </div>
    <a href="{{ .PortalURL }}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none;">
      Access Your Portal
    </a>
  </div>
</body>
</html>',
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  subject_line = EXCLUDED.subject_line,
  updated_at = NOW();

-- Employee Invitation Template
INSERT INTO public.email_templates (template_name, subject_line, html_content, is_active) VALUES (
  'employee-invitation',
  '📧 You''re Invited to Join {{ .OrganizationName }} Training',
  '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px;">
    <h1 style="color: #16a34a;">Training Invitation</h1>
    <p>You have been invited to complete required cannabis training for {{ .OrganizationName }}.</p>
    <div style="background: #f9fafb; padding: 15px; margin: 20px 0;">
      <p><strong>Training Deadline:</strong> {{ .TrainingDeadline }}</p>
    </div>
    <a href="{{ .RegistrationURL }}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none;">
      Register & Start Training
    </a>
  </div>
</body>
</html>',
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  subject_line = EXCLUDED.subject_line,
  updated_at = NOW();