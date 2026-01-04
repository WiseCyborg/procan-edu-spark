-- Add category column to email_templates for internal vs customer distinction
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'customer' CHECK (category IN ('customer', 'internal', 'system'));

-- Add email_type column if missing (for audit trail)
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS email_type TEXT DEFAULT 'transactional';

-- Add internal badge requirement flag
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS requires_internal_badge BOOLEAN DEFAULT false;

-- Create email_outbox table for comprehensive logging
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  has_html BOOLEAN DEFAULT false,
  has_text BOOLEAN DEFAULT false,
  cta_url TEXT,
  environment TEXT DEFAULT 'production',
  provider TEXT,
  provider_message_id TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  rendered_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on email_outbox
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- Admin-only policy for email_outbox
CREATE POLICY "Admins can view email outbox" ON public.email_outbox
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert internal notification templates
INSERT INTO public.email_templates (template_name, subject_line, is_active, category, requires_internal_badge, html_content)
VALUES 
(
  'admin-application-pending-review',
  '[{{.Environment}}][ADMIN] New Application Pending Review — {{.OrganizationName}}',
  true,
  'internal',
  true,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2A7F3F 0%, #1a5a2a 100%); padding: 24px; text-align: center;">
              <img src="https://procannedu.com/logo-white.png" alt="ProCann Edu" style="height: 40px; margin-bottom: 8px;">
              <div style="display: inline-block; background: #ff6b35; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 12px;">
                INTERNAL NOTIFICATION
              </div>
              <div style="color: white; font-size: 12px; margin-top: 8px;">
                ENV: {{.Environment}}
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">New Application Pending Review</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                A new dispensary application requires your review.
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8f9fa; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0;"><strong>Organization:</strong> {{.OrganizationName}}</p>
                    <p style="margin: 0 0 8px 0;"><strong>License #:</strong> {{.LicenseNumber}}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Contact:</strong> {{.ContactEmail}}</p>
                    <p style="margin: 0;"><strong>Submitted:</strong> {{.SubmittedAt}}</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: #2A7F3F;">
                    <a href="{{.ReviewUrl}}" target="_blank" style="display: inline-block; padding: 14px 32px; color: white; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Review Application
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback link -->
              <p style="color: #666; font-size: 14px; margin-top: 16px; text-align: center;">
                Or copy this link: <a href="{{.ReviewUrl}}" style="color: #2A7F3F;">{{.ReviewUrl}}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                This is an internal notification from ProCann Edu Admin System.
              </p>
              <p style="color: #888; font-size: 12px; margin: 8px 0 0 0;">
                Entity ID: {{.EntityId}} | Timestamp: {{.Timestamp}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
),
(
  'admin-system-alert',
  '[{{.Environment}}][SYSTEM] {{.AlertType}} — {{.AlertTitle}}',
  true,
  'internal',
  true,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: #dc2626; padding: 24px; text-align: center;">
              <img src="https://procannedu.com/logo-white.png" alt="ProCann Edu" style="height: 40px; margin-bottom: 8px;">
              <div style="display: inline-block; background: white; color: #dc2626; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 12px;">
                SYSTEM ALERT
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="color: #dc2626; font-size: 24px; margin: 0 0 16px 0;">{{.AlertTitle}}</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                {{.AlertDescription}}
              </p>
              
              {{ if .ActionRequired }}
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: #dc2626;">
                    <a href="{{.ActionUrl}}" target="_blank" style="display: inline-block; padding: 14px 32px; color: white; text-decoration: none; font-weight: 600; font-size: 16px;">
                      {{.ActionLabel}}
                    </a>
                  </td>
                </tr>
              </table>
              {{ end }}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                ProCann Edu System Monitoring | ENV: {{.Environment}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
),
(
  'admin-payment-failed-notification',
  '[{{.Environment}}][ADMIN] Payment Failed — {{.OrganizationName}}',
  true,
  'internal',
  true,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2A7F3F 0%, #1a5a2a 100%); padding: 24px; text-align: center;">
              <img src="https://procannedu.com/logo-white.png" alt="ProCann Edu" style="height: 40px;">
              <div style="display: inline-block; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 12px;">
                INTERNAL NOTIFICATION
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="color: #f59e0b; font-size: 24px; margin: 0 0 16px 0;">⚠️ Payment Failed</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                A payment attempt has failed and may require follow-up.
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #fef3c7; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0;"><strong>Organization:</strong> {{.OrganizationName}}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Amount:</strong> ${{.Amount}}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Error:</strong> {{.ErrorMessage}}</p>
                    <p style="margin: 0;"><strong>Timestamp:</strong> {{.Timestamp}}</p>
                  </td>
                </tr>
              </table>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 6px; background: #2A7F3F;">
                    <a href="{{.AdminDashboardUrl}}" target="_blank" style="display: inline-block; padding: 14px 32px; color: white; text-decoration: none; font-weight: 600; font-size: 16px;">
                      View in Admin Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                ProCann Edu Admin System | ENV: {{.Environment}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
)
ON CONFLICT (template_name) DO UPDATE SET
  subject_line = EXCLUDED.subject_line,
  html_content = EXCLUDED.html_content,
  category = EXCLUDED.category,
  requires_internal_badge = EXCLUDED.requires_internal_badge,
  is_active = EXCLUDED.is_active;