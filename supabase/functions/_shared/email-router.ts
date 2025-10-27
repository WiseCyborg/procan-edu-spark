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
   * Send email with automatic failover from Resend to SMTP
   * Logs the attempt to email_logs table
   */
  async sendWithFailover(options: EmailOptions, supabaseClient?: any): Promise<EmailResult> {
    const startTime = Date.now();
    const emailLogId = crypto.randomUUID();
    
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
    
    // Try Resend first (faster, better tracking)
    try {
      const result = await this.resend.emails.send({
        from: options.from || "ProCann Edu <noreply@procannedu.com>",
        to: [options.to],
        subject: options.subject,
        html: options.html,
      });
      
      const responseTime = Date.now() - startTime;
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
      console.warn(`⚠️ Resend failed: ${resendError.message}, trying SMTP fallback...`);
      
      // Fallback to SMTP
      try {
        const smtpService = new SMTPEmailService();
        const smtpResult = await smtpService.sendEmail({
          to: options.to,
          subject: options.subject,
          html: options.html,
          from: options.from,
        });
        await smtpService.close();
        
        if (smtpResult.success) {
          const responseTime = Date.now() - startTime;
          console.log(`✅ Email sent via SMTP fallback in ${responseTime}ms`);
          
          // Update log with success
          if (supabaseClient) {
            await supabaseClient.from("email_logs").update({
              status: 'sent',
              provider: 'smtp',
              provider_id: smtpResult.messageId,
              sent_at: new Date().toISOString(),
              metadata: { 
                ...options.metadata, 
                response_time_ms: responseTime,
                failover_from: 'resend',
                resend_error: resendError.message,
              },
            }).eq('id', emailLogId);
          }
          
          return {
            success: true,
            provider: 'smtp',
            providerId: smtpResult.messageId,
            responseTime,
          };
        }
        throw new Error(smtpResult.error || "SMTP send failed");
      } catch (smtpError: any) {
        const responseTime = Date.now() - startTime;
        const errorMessage = `Both providers failed - Resend: ${resendError.message}, SMTP: ${smtpError.message}`;
        console.error(`❌ ${errorMessage}`);
        
        // Update log with failure
        if (supabaseClient) {
          await supabaseClient.from("email_logs").update({
            status: 'failed',
            error_message: errorMessage,
            metadata: { 
              ...options.metadata, 
              response_time_ms: responseTime,
              resend_error: resendError.message,
              smtp_error: smtpError.message,
            },
          }).eq('id', emailLogId);
        }
        
        return {
          success: false,
          provider: 'both_failed',
          error: errorMessage,
          responseTime,
        };
      }
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
