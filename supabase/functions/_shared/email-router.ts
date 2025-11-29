import { Resend } from "npm:resend@2.0.0";
import { SMTPEmailService } from "./smtp-email-service.ts";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  metadata?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  provider: 'resend' | 'smtp' | 'both_failed';
  providerId?: string;
  error?: string;
  responseTime: number;
}

// Simple HTML to text converter for fallback
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class EmailRouter {
  private resend: Resend;
  
  constructor() {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.warn("⚠️ RESEND_API_KEY not configured, SMTP will be used as primary");
    }
    this.resend = new Resend(apiKey || "");
  }
  
  /**
   * Send email via Resend with SMTP fallback
   * Logs the attempt to email_logs table
   */
  async sendWithFailover(options: EmailOptions, supabaseClient?: any): Promise<EmailResult> {
    const startTime = Date.now();
    const emailLogId = crypto.randomUUID();
    
    // SMTP fallback ENABLED to handle Resend domain verification issues
    const SMTP_FALLBACK_ENABLED = true;
    
    // Log initial attempt if supabase client provided
    if (supabaseClient) {
      await supabaseClient.from("email_logs").insert({
        id: emailLogId,
        recipient_email: options.to,
        subject: options.subject,
        html_content: options.html,
        email_type: options.metadata?.email_type || 'general',
        status: 'sending',
        metadata: options.metadata || {},
      });
    }
    
    // Try Resend first, then SMTP fallback if enabled
    try {
      console.log(`📤 [EMAIL-ROUTER v1.2] SMTP fallback: ${SMTP_FALLBACK_ENABLED ? 'ENABLED' : 'DISABLED'}`);
      console.log(`📤 [EMAIL-ROUTER v1.2] Attempting Resend send`);
      console.log(`📤 [EMAIL-ROUTER] To: ${options.to}`);
      console.log(`📤 [EMAIL-ROUTER] Subject: ${options.subject}`);
      console.log(`📤 [EMAIL-ROUTER] From: ${options.from || "ProCann Edu <noreply@procannedu.com>"}`);
      
      const result = await this.resend.emails.send({
        from: options.from || "ProCann Edu <noreply@procannedu.com>",
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: extractTextFromHtml(options.html),
        reply_to: "support@procannedu.com",
        headers: {
          "List-Unsubscribe": "<mailto:unsubscribe@procannedu.com>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": crypto.randomUUID(),
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      // CRITICAL: Verify result structure
      if (!result.data) {
        console.error(`❌ [EMAIL-ROUTER] Resend returned no data:`, JSON.stringify(result));
        throw new Error(`Resend API returned no data. Full response: ${JSON.stringify(result)}`);
      }
      
      console.log(`✅ [EMAIL-ROUTER v1.2] Resend SUCCESS in ${responseTime}ms`);
      console.log(`✅ [EMAIL-ROUTER] Provider ID: ${result.data.id}`);
      console.log(`✅ Email sent via Resend in ${responseTime}ms:`, result.data?.id);
      
      // Update log with success
      if (supabaseClient) {
        await supabaseClient.from("email_logs").update({
          status: 'sent',
          provider: 'resend',
          provider_id: result.data?.id,
          sent_at: new Date().toISOString(),
          metadata: { ...options.metadata, response_time_ms: responseTime },
        }).eq('id', emailLogId);
      }
      
      return {
        success: true,
        provider: 'resend',
        providerId: result.data?.id,
        responseTime,
      };
    } catch (resendError: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [EMAIL-ROUTER v1.2] Resend FAILED after ${responseTime}ms`);
      console.error(`❌ [EMAIL-ROUTER] Error message: ${resendError.message}`);
      console.error(`❌ [EMAIL-ROUTER] Error name: ${resendError.name}`);
      console.error(`❌ [EMAIL-ROUTER] Status code: ${resendError.statusCode}`);
      
      // Try SMTP fallback if enabled
      if (SMTP_FALLBACK_ENABLED) {
        console.log(`🔄 [EMAIL-ROUTER] Attempting SMTP fallback...`);
        try {
          const smtpService = new SMTPEmailService();
          const smtpResult = await smtpService.sendEmail({
            to: options.to,
            subject: options.subject,
            html: options.html,
            from: options.from
          });
          
          if (smtpResult.success) {
            console.log(`✅ [EMAIL-ROUTER] SMTP fallback SUCCESS`);
            
            // Update log with SMTP success
            if (supabaseClient) {
              await supabaseClient.from("email_logs").update({
                status: 'sent',
                provider: 'smtp',
                provider_id: smtpResult.messageId,
                sent_at: new Date().toISOString(),
                metadata: { 
                  ...options.metadata, 
                  response_time_ms: responseTime,
                  resend_error: resendError.message,
                  smtp_fallback: true
                },
              }).eq('id', emailLogId);
            }
            
            return {
              success: true,
              provider: 'smtp',
              providerId: smtpResult.messageId,
              responseTime,
            };
          } else {
            throw new Error(smtpResult.error || 'SMTP send failed');
          }
        } catch (smtpError: any) {
          console.error(`❌ [EMAIL-ROUTER] SMTP fallback FAILED: ${smtpError.message}`);
        }
      } else {
        console.error(`❌ [EMAIL-ROUTER] SMTP fallback DISABLED - failing fast`);
      }
      
      // Update log with failure
      if (supabaseClient) {
        await supabaseClient.from("email_logs").update({
          status: 'failed',
          error_message: `Resend failed: ${resendError.message}${SMTP_FALLBACK_ENABLED ? '. SMTP fallback also failed.' : '. SMTP fallback disabled.'}`,
          metadata: { 
            ...options.metadata, 
            response_time_ms: responseTime,
            resend_error: resendError.message,
            smtp_fallback_enabled: SMTP_FALLBACK_ENABLED,
          },
        }).eq('id', emailLogId);
      }
      
      return {
        success: false,
        provider: 'both_failed',
        error: `Email send failed: ${resendError.message}`,
        responseTime,
      };
    }
  }
  
  /**
   * Quick send without failover (for time-sensitive emails)
   * Falls back to failover if Resend fails
   */
  async sendFast(options: EmailOptions, supabaseClient?: any): Promise<EmailResult> {
    return this.sendWithFailover(options, supabaseClient);
  }
}
