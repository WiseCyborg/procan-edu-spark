// EmailService — honest send + failure logging.
//
// Backwards-compatible API: callers still get `{ success: true, data }` on
// success. On failure we (a) attempt the SMTP fallback used by EmailRouter,
// (b) write a row to `email_logs` with status='failed' + error_message, and
// (c) THROW so the outer handler returns a non-200 status. We never silently
// return success when the provider call failed.
//
// We do NOT write a success row here — every existing caller already inserts
// an email_logs row after `.send()` returns, so logging success here would
// produce duplicates. The DB-side `reap_stuck_emails` cron handles any rows
// stuck in 'sending'.

import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPEmailService } from "./smtp-email-service.ts";

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  email_type?: string;
  metadata?: Record<string, unknown>;
}

export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.warn("⚠️ [EmailService] RESEND_API_KEY missing — SMTP will be primary");
    }
    this.resend = new Resend(apiKey ?? "");
  }

  async send(options: SendOptions) {
    const from = options.from || "ProCann Edu <noreply@procannedu.com>";

    // 1) Try Resend
    try {
      const result = await this.resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      if (!result?.data?.id) {
        throw new Error(
          `Resend returned no id (response: ${JSON.stringify(result)})`,
        );
      }
      return { success: true as const, data: result, provider: "resend" as const };
    } catch (resendError: any) {
      console.error("[EmailService] Resend failed:", resendError?.message ?? resendError);

      // 2) SMTP fallback
      try {
        const smtp = new SMTPEmailService();
        const smtpResult = await smtp.sendEmail({
          to: options.to,
          subject: options.subject,
          html: options.html,
          from,
        });
        if (smtpResult.success) {
          return {
            success: true as const,
            data: { id: smtpResult.messageId },
            provider: "smtp" as const,
          };
        }
        throw new Error(smtpResult.error || "SMTP send failed");
      } catch (smtpError: any) {
        const errMsg = `Resend: ${resendError?.message ?? "unknown"}; SMTP: ${smtpError?.message ?? "unknown"}`;
        console.error("[EmailService] BOTH providers failed:", errMsg);

        // 3) Persist failure to email_logs so admins can see + retry
        try {
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          );
          await supabase.from("email_logs").insert({
            recipient_email: options.to,
            subject: options.subject,
            email_type: options.email_type ?? "general",
            status: "failed",
            error_message: errMsg,
            html_content: options.html,
            metadata: options.metadata ?? {},
          });
        } catch (logErr) {
          console.error("[EmailService] failed to log failure:", logErr);
        }

        // 4) Surface to caller — never silently return success
        throw new Error(errMsg);
      }
    }
  }
}
