-- Insert manager registration reminder email templates into email_templates table

-- Insert 5-day reminder template
INSERT INTO email_templates (
  template_name,
  subject_line,
  html_content,
  variables,
  is_active
) VALUES (
  'manager-registration-reminder-5day',
  '⏰ Registration Expires in 5 Days',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Reminder - 5 Days Left</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #f59e0b; margin: 0; font-size: 28px; }
    .icon { font-size: 48px; margin-bottom: 10px; }
    .content { color: #333; line-height: 1.6; font-size: 16px; }
    .reminder-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; margin: 20px 0; min-height: 44px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    @media only screen and (max-width: 600px) {
      .container { padding: 20px; }
      .cta-button { width: 100%; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">⏰</div>
      <h1>Registration Reminder</h1>
    </div>
    
    <div class="content">
      <p>Dear {{ .ContactPerson }},</p>
      
      <p>Your manager registration link for <strong>{{ .OrganizationName }}</strong> expires in <strong>{{ .DaysRemaining }} days</strong>!</p>
      
      <div class="reminder-box">
        <h3 style="margin-top: 0; color: #f59e0b;">⚠️ Action Required</h3>
        <p style="font-size: 18px; margin: 10px 0;">Complete registration soon</p>
        <p style="margin-bottom: 0;">Don''t lose access to your training seats!</p>
      </div>
      
      <div style="text-align: center;">
        <a href="{{ .RegistrationURL }}" class="cta-button">Complete Registration Now</a>
      </div>
      
      <p><strong>Why register now?</strong></p>
      <ul>
        <li>✅ Immediate access to manager dashboard</li>
        <li>✅ Begin inviting employees right away</li>
        <li>✅ Start tracking team progress</li>
        <li>✅ Meet compliance requirements faster</li>
      </ul>
      
      <p>Registration only takes 5 minutes!</p>
      
      <p>Questions? Contact us at <a href="mailto:support@procannedu.com">support@procannedu.com</a></p>
      
      <p>Best regards,<br><strong>ProCann Edu Team</strong></p>
    </div>
    
    <div class="footer">
      <p>© 2025 ProCann Edu | Responsible Vendor Training</p>
    </div>
  </div>
</body>
</html>',
  '["ContactPerson", "OrganizationName", "DaysRemaining", "RegistrationURL"]'::jsonb,
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- Insert 3-day reminder template
INSERT INTO email_templates (
  template_name,
  subject_line,
  html_content,
  variables,
  is_active
) VALUES (
  'manager-registration-reminder-3day',
  '🚨 URGENT: Registration Expires in 3 Days',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>URGENT: Registration Expires in 3 Days</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #dc2626; margin: 0; font-size: 28px; }
    .icon { font-size: 48px; margin-bottom: 10px; }
    .content { color: #333; line-height: 1.6; font-size: 16px; }
    .urgent-box { background: #fee2e2; border: 2px solid #dc2626; padding: 25px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .cta-button { display: inline-block; background: #dc2626; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; margin: 20px 0; min-height: 44px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    @media only screen and (max-width: 600px) {
      .container { padding: 20px; }
      .cta-button { width: 100%; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🚨</div>
      <h1>URGENT: Registration Expires Soon</h1>
    </div>
    
    <div class="content">
      <p>Dear {{ .ContactPerson }},</p>
      
      <p><strong>Final reminder:</strong> Your manager registration link expires in <strong>{{ .DaysRemaining }} days</strong>!</p>
      
      <div class="urgent-box">
        <h3 style="margin-top: 0; color: #dc2626;">⚠️ IMMEDIATE ACTION REQUIRED</h3>
        <p style="font-size: 20px; margin: 10px 0; font-weight: bold;">Registration expires soon</p>
        <p style="margin-bottom: 0; font-size: 16px;">After this date, you''ll need to contact support for a new link</p>
      </div>
      
      <div style="text-align: center;">
        <a href="{{ .RegistrationURL }}" class="cta-button">Complete Registration NOW</a>
      </div>
      
      <p><strong>⚠️ What happens if you don''t register:</strong></p>
      <ul style="color: #dc2626;">
        <li>Your registration link will expire</li>
        <li>Access to training seats will be delayed</li>
        <li>Your team cannot begin training</li>
        <li>Compliance deadlines may be missed</li>
      </ul>
      
      <p><strong>✅ What happens when you register (5 minutes):</strong></p>
      <ul style="color: #16a34a;">
        <li>Instant access to manager dashboard</li>
        <li>Ability to invite employees immediately</li>
        <li>Full control over training deadlines</li>
        <li>Real-time progress monitoring</li>
      </ul>
      
      <p><strong>Need help?</strong> Contact us immediately:</p>
      <ul>
        <li>Email: <a href="mailto:support@procannedu.com">support@procannedu.com</a></li>
        <li>Phone: (555) 123-4567</li>
      </ul>
      
      <p>Don''t wait - register now!</p>
      
      <p>Best regards,<br><strong>ProCann Edu Team</strong></p>
    </div>
    
    <div class="footer">
      <p>© 2025 ProCann Edu | Responsible Vendor Training</p>
    </div>
  </div>
</body>
</html>',
  '["ContactPerson", "OrganizationName", "DaysRemaining", "RegistrationURL"]'::jsonb,
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = NOW();