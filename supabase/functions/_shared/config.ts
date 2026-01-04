/**
 * Centralized Application Configuration for Edge Functions
 * 
 * This provides a single source of truth for URLs, branding, and constants
 * used across all edge functions.
 */

// Environment-aware base URL
export const getBaseUrl = (): string => {
  // Production domain (preferred)
  const prodDomain = 'https://procann-edu.lovable.app';
  
  // Fallback to environment variable if set
  const envUrl = Deno.env.get('APP_BASE_URL');
  if (envUrl) return envUrl;
  
  return prodDomain;
};

// Support email
export const SUPPORT_EMAIL = 'support@procannedu.com';

// Brand configuration
export const BRAND = {
  name: 'ProCann Edu',
  tagline: 'Maryland Cannabis Compliance Training',
  primaryColor: '#16a34a', // Green-600
  logoUrl: `${getBaseUrl()}/logo.png`,
};

// Email "from" addresses
export const EMAIL_FROM = {
  noreply: 'ProCann Edu <noreply@procannedu.com>',
  support: 'ProCann Support <support@procannedu.com>',
  notifications: 'ProCann Notifications <notifications@procannedu.com>',
};

// Common routes
export const ROUTES = {
  home: '/',
  auth: '/auth',
  managerAuth: '/auth?role=dispensary_manager&tab=accesskey',
  employeeAuth: '/auth?role=student&tab=code',
  managerDashboard: '/dispensary-manager-dashboard',
  employeeDashboard: '/dashboard',
  course: '/course',
  certificates: '/certificates',
  payment: '/payment',
  paymentSuccess: '/payment-success',
  managerRegistration: '/register/manager',
  teamManagement: '/team-management',
  purchaseSeats: '/purchase-seats',
};

// Generate full URLs
export const getFullUrl = (path: string): string => {
  const base = getBaseUrl();
  // Ensure no double slashes
  if (path.startsWith('/')) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
};

// Email template helper - generates consistent email footer
export const getEmailFooter = (): string => `
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
    <p style="margin: 0 0 8px 0;">
      <strong>${BRAND.name}</strong> - ${BRAND.tagline}
    </p>
    <p style="margin: 0 0 8px 0;">
      Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND.primaryColor};">${SUPPORT_EMAIL}</a>
    </p>
    <p style="margin: 0; color: #9ca3af;">
      This email was sent by ${BRAND.name}. If you didn't expect this email, please ignore it.
    </p>
  </div>
`;

// Email template wrapper
export const wrapEmailHtml = (content: string, previewText?: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name}</title>
  ${previewText ? `<meta name="x-apple-disable-message-reformatting">` : ''}
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              ${content}
              ${getEmailFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Generate a CTA button
export const getEmailButton = (text: string, url: string, color: string = BRAND.primaryColor): string => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
    <tr>
      <td style="border-radius: 6px; background: ${color};">
        <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; color: white; text-decoration: none; font-weight: 600; font-size: 16px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">
    Or copy this link: <a href="${url}" style="color: ${color}; word-break: break-all;">${url}</a>
  </p>
`;
