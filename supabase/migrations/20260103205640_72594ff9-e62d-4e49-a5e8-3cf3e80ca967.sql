-- Add missing email templates with proper HTML and CTA buttons

-- Payment Link template (for approved applications awaiting payment)
INSERT INTO email_templates (
  template_name, 
  html_content, 
  is_active,
  subject_line,
  version
) VALUES (
  'payment-link',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Payment</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">💳 Payment Required</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Complete Your Registration</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear <strong>{{ .ContactPerson }}</strong>,</p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Your application for <strong>{{ .OrganizationName }}</strong> has been approved! 🎉</p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">To activate your account and start training your team, please complete your payment.</p>
              
              <!-- Payment Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #4a4a4a;"><strong>Training Credits:</strong> {{ .Credits }}</p>
                    <p style="margin: 0 0 10px 0; color: #4a4a4a;"><strong>Total Amount:</strong> ${{ .TotalAmount }}</p>
                    <p style="margin: 0; color: #4a4a4a;"><strong>Payment Deadline:</strong> {{ .PaymentDeadline }}</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{ .PaymentUrl }}" style="display: inline-block; background: #16a34a; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Complete Payment</a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 10px 0 0 0;">
                If the button doesn''t work, copy and paste this link:<br>
                <a href="{{ .PaymentUrl }}" style="color: #16a34a; word-break: break-all;">{{ .PaymentUrl }}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">© 2025 ProCann Edu. All rights reserved.</p>
              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">Maryland Responsible Vendor Training Platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  true,
  '💳 Payment Required - Complete Your Registration',
  1
) ON CONFLICT (template_name) DO UPDATE SET 
  html_content = EXCLUDED.html_content,
  is_active = true,
  updated_at = now();

-- Payment Failed template
INSERT INTO email_templates (
  template_name, 
  html_content, 
  is_active,
  subject_line,
  version
) VALUES (
  'payment-failed',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Payment Failed</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Action Required</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear <strong>{{ .ContactPerson }}</strong>,</p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">We were unable to process your payment for <strong>{{ .OrganizationName }}</strong>.</p>
              
              <!-- Error Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #991b1b;"><strong>Error:</strong> {{ .ErrorMessage }}</p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Please try again with a different payment method or contact your bank.</p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{ .RetryURL }}" style="display: inline-block; background: #16a34a; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Retry Payment</a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 10px 0 0 0;">
                If the button doesn''t work, copy and paste this link:<br>
                <a href="{{ .RetryURL }}" style="color: #16a34a; word-break: break-all;">{{ .RetryURL }}</a>
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0;">Need help? Contact us at <a href="mailto:support@procannedu.com" style="color: #16a34a;">support@procannedu.com</a></p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">© 2025 ProCann Edu. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  true,
  '⚠️ Payment Failed - Action Required',
  1
) ON CONFLICT (template_name) DO UPDATE SET 
  html_content = EXCLUDED.html_content,
  is_active = true,
  updated_at = now();

-- Update the application-approved template to use PortalURL correctly
UPDATE email_templates 
SET html_content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Application Approved!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Welcome to ProCann Edu</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Congratulations! Your dispensary application has been approved.</p>
              
              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #4a4a4a;"><strong>Organization:</strong> {{ .OrganizationName }}</p>
                    <p style="margin: 0; color: #4a4a4a;"><strong>Access Key:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">{{ .AccessKey }}</code></p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{ .PortalURL }}" style="display: inline-block; background: #16a34a; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Access Your Portal</a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 10px 0 0 0;">
                If the button doesn''t work, copy and paste this link:<br>
                <a href="{{ .PortalURL }}" style="color: #16a34a; word-break: break-all;">{{ .PortalURL }}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">© 2025 ProCann Edu. All rights reserved.</p>
              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">Maryland Responsible Vendor Training Platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
    updated_at = now()
WHERE template_name = 'application-approved';