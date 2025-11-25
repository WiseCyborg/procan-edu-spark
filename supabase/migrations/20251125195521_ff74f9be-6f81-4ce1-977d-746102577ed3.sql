-- Insert rejection email template into database
INSERT INTO email_templates (
  template_name,
  subject_line,
  html_content,
  is_active,
  variables
) VALUES (
  'application-rejected',
  'ProCann Edu Application Status Update',
  '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Status Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc3545; padding-bottom: 20px;">
            <div style="font-size: 28px; font-weight: bold; color: #2A7F3F; margin-bottom: 10px;">ProCann Edu</div>
            <p>Maryland Cannabis Education Platform</p>
        </div>

        <h1 style="color: #dc3545; font-size: 24px; margin-bottom: 20px;">Application Status Update</h1>

        <p>Dear {{ .ContactPerson }},</p>

        <p>Thank you for your interest in partnering with ProCann Edu for compliance training at <strong>{{ .OrganizationName }}</strong>.</p>

        <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
            <strong style="color: #dc3545;">Application Status:</strong> Not Approved
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <div style="font-weight: bold; color: #856404; margin-bottom: 8px;">Reason:</div>
            <p>{{ .RejectionReason }}</p>
        </div>

        <p>We appreciate your interest in our platform. If you believe this decision was made in error or if you have questions about your application status, please don''t hesitate to reach out to our support team.</p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666;">
            <h3 style="color: #2A7F3F; margin-bottom: 10px;">Need Assistance?</h3>
            <p>Our support team is here to help clarify any concerns or questions you may have.</p>
            <p>
                <strong>Email:</strong> <a href="mailto:support@procannedu.com" style="color: #2A7F3F;">support@procannedu.com</a><br>
                <strong>Phone:</strong> (555) 123-4567
            </p>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;">
            <p>&copy; 2025 ProCann Edu. All rights reserved.</p>
            <p>This email was sent regarding your dispensary application.</p>
        </div>
    </div>
</body>
</html>',
  true,
  '["ContactPerson", "OrganizationName", "RejectionReason"]'::jsonb
)
ON CONFLICT (template_name) DO UPDATE
SET 
  html_content = EXCLUDED.html_content,
  is_active = true,
  updated_at = now();