-- Insert application-received email template
INSERT INTO public.email_templates (
  template_name,
  subject_line,
  html_content,
  variables,
  version,
  is_active
) VALUES (
  'application-received',
  'Application Received - ProCann Edu RVT Program',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .timeline { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .timeline h3 { color: #2563eb; margin-top: 0; }
    .timeline ol { padding-left: 20px; }
    .timeline li { margin: 12px 0; }
    .reference-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .reference-number { font-size: 20px; font-weight: bold; color: #78350f; font-family: ''Courier New'', monospace; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .icon { font-size: 48px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="icon">📝</div>
    <h1>Application Received!</h1>
    <p style="font-size: 16px; margin: 10px 0 0 0;">Thank you for applying to ProCannEdu</p>
  </div>
  
  <div class="content">
    <p>Dear <strong>{{ .ContactPerson }}</strong>,</p>
    
    <p>Thank you for submitting your dispensary application for <strong>{{ .OrganizationName }}</strong>. We have successfully received your application and it''s now under review.</p>
    
    <div class="reference-box">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #78350f;">📋 Application Reference Number</p>
      <div class="reference-number">{{ .ApplicationId }}</div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #78350f;">Save this number for your records</p>
    </div>

    <div class="info-box">
      <p style="margin: 0;"><strong>📧 Contact Email:</strong> {{ .ContactEmail }}</p>
      <p style="margin: 8px 0 0 0;"><strong>🏢 License Number:</strong> {{ .LicenseNumber }}</p>
    </div>

    <div class="timeline">
      <h3>⏱️ What Happens Next?</h3>
      <ol>
        <li>
          <strong>Review Process (24-48 hours):</strong><br>
          Our team will carefully review your application and verify your license information.
        </li>
        <li>
          <strong>Email Notification:</strong><br>
          You''ll receive an email once your application has been reviewed with next steps.
        </li>
        <li>
          <strong>Get Started:</strong><br>
          Upon approval, you''ll receive your organization access key to begin onboarding your team.
        </li>
      </ol>
    </div>

    <div class="info-box">
      <h3 style="margin-top: 0; color: #2563eb;">Need Assistance?</h3>
      <p>If you have questions about your application, please contact us:</p>
      <ul style="padding-left: 20px; margin: 8px 0;">
        <li>📧 Email: <a href="mailto:support@procannedu.com">support@procannedu.com</a></li>
        <li>📞 Phone: 1-800-PROCANN</li>
      </ul>
      <p style="margin: 8px 0 0 0; font-size: 14px;">Reference your application number: <code>{{ .ApplicationId }}</code></p>
    </div>

    <p style="margin-top: 30px;">We appreciate your interest in ProCannEdu and look forward to partnering with you!</p>
    
    <p style="margin-top: 20px;">
      Best regards,<br>
      <strong>The ProCannEdu Team</strong>
    </p>
  </div>

  <div class="footer">
    <p>&copy; 2025 ProCannEdu. All rights reserved.</p>
    <p style="margin: 5px 0 0 0;">Maryland Responsible Vendor Training Platform</p>
  </div>
</body>
</html>',
  '{"ContactPerson": "Contact person name", "OrganizationName": "Organization name", "ContactEmail": "Contact email", "LicenseNumber": "License number", "ApplicationId": "Application reference ID"}'::jsonb,
  1,
  true
)
ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  subject_line = EXCLUDED.subject_line,
  variables = EXCLUDED.variables,
  updated_at = NOW();