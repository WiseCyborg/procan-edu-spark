import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";
import { SMTPEmailService } from "../_shared/smtp-email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetryAttempt {
  attempt: number;
  timestamp: string;
  provider: string;
  status: string;
  error?: string;
  responseTimeMs?: number;
}

interface EmailMetadata {
  retry_count?: number;
  retry_history?: RetryAttempt[];
  last_retry_at?: string;
  [key: string]: any;
}

// Calculate next retry delay based on attempt count (exponential backoff)
function getNextRetryDelayMinutes(retryCount: number): number {
  const delays = [5, 30, 120, 360]; // 5min, 30min, 2hr, 6hr
  return delays[Math.min(retryCount, delays.length - 1)];
}

// Check if enough time has passed since last attempt
function shouldRetry(lastAttemptTime: string, retryCount: number): boolean {
  const delayMinutes = getNextRetryDelayMinutes(retryCount);
  const lastAttempt = new Date(lastAttemptTime);
  const now = new Date();
  const minutesSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / (1000 * 60);
  return minutesSinceLastAttempt >= delayMinutes;
}

// Try sending with Resend, fallback to SMTP
async function sendWithFailover(
  to: string,
  subject: string,
  html: string,
  from: string = "ProCann Edu <noreply@procannedu.com>"
): Promise<{ success: boolean; provider: string; error?: string; responseTimeMs: number }> {
  const startTime = Date.now();

  // Try Resend first (faster, better tracking)
  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const result = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    console.log("✅ Email sent via Resend:", result.data?.id);
    return {
      success: true,
      provider: "resend",
      responseTimeMs: Date.now() - startTime,
    };
  } catch (resendError: any) {
    console.warn(`⚠️ Resend failed (${resendError.message}), trying SMTP fallback...`);

    // Fallback to SMTP
    try {
      const smtpService = new SMTPEmailService();
      const smtpResult = await smtpService.sendEmail({ to, subject, html, from });
      await smtpService.close();

      if (smtpResult.success) {
        console.log("✅ Email sent via SMTP fallback");
        return {
          success: true,
          provider: "smtp",
          responseTimeMs: Date.now() - startTime,
        };
      }
      throw new Error(smtpResult.error || "SMTP send failed");
    } catch (smtpError: any) {
      console.error("❌ Both providers failed:", { resend: resendError.message, smtp: smtpError.message });
      return {
        success: false,
        provider: "both_failed",
        error: `Resend: ${resendError.message} | SMTP: ${smtpError.message}`,
        responseTimeMs: Date.now() - startTime,
      };
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Starting automatic email retry process...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Query emails that need retry
    const { data: failedEmails, error: queryError } = await supabase
      .from("email_logs")
      .select("*")
      .or(
        `and(status.eq.failed,metadata->retry_count.lt.4),` +
        `and(status.eq.sending,created_at.lt.${new Date(Date.now() - 10 * 60 * 1000).toISOString()}),` +
        `and(status.eq.pending,created_at.lt.${new Date(Date.now() - 5 * 60 * 1000).toISOString()})`
      )
      .order("created_at", { ascending: true })
      .limit(50);

    if (queryError) {
      console.error("❌ Query error:", queryError);
      throw queryError;
    }

    console.log(`📧 Found ${failedEmails?.length || 0} emails to retry`);

    let retriedCount = 0;
    let successCount = 0;
    let permanentFailures: string[] = [];

    for (const email of failedEmails || []) {
      const metadata: EmailMetadata = email.metadata || {};
      const retryCount = metadata.retry_count || 0;
      const lastRetryAt = metadata.last_retry_at || email.created_at;

      // Check if enough time has passed for retry
      if (retryCount > 0 && !shouldRetry(lastRetryAt, retryCount)) {
        console.log(`⏭️ Skipping email ${email.id} - not enough time since last retry`);
        continue;
      }

      // Check if already at max retries
      if (retryCount >= 4) {
        console.log(`🚫 Email ${email.id} reached max retries - marking as permanent failure`);
        permanentFailures.push(email.recipient_email);
        
        await supabase
          .from("email_logs")
          .update({
            status: "permanent_failure",
            error_message: "Maximum retry attempts (4) exceeded",
            metadata: {
              ...metadata,
              permanent_failure_at: new Date().toISOString(),
            },
          })
          .eq("id", email.id);
        
        continue;
      }

      console.log(`🔄 Retrying email ${email.id} (attempt ${retryCount + 1}/4)...`);
      retriedCount++;

      // Attempt to send with failover
      const result = await sendWithFailover(
        email.recipient_email,
        email.subject || "Message from ProCann Edu",
        email.html_content || "<p>Please contact support for assistance.</p>"
      );

      // Update retry history
      const retryHistory: RetryAttempt[] = metadata.retry_history || [];
      retryHistory.push({
        attempt: retryCount + 1,
        timestamp: new Date().toISOString(),
        provider: result.provider,
        status: result.success ? "success" : "failed",
        error: result.error,
        responseTimeMs: result.responseTimeMs,
      });

      // Update email log
      const updateData = {
        status: result.success ? "sent" : "failed",
        sent_at: result.success ? new Date().toISOString() : null,
        provider: result.success ? result.provider : null,
        error_message: result.error || null,
        metadata: {
          ...metadata,
          retry_count: retryCount + 1,
          retry_history: retryHistory,
          last_retry_at: new Date().toISOString(),
        },
      };

      await supabase
        .from("email_logs")
        .update(updateData)
        .eq("id", email.id);

      if (result.success) {
        console.log(`✅ Email ${email.id} sent successfully via ${result.provider}`);
        successCount++;
      } else {
        console.error(`❌ Email ${email.id} retry failed:`, result.error);
      }

      // Small delay between retries to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Alert admins if there are permanent failures
    if (permanentFailures.length > 0) {
      console.log(`🚨 Alerting admins about ${permanentFailures.length} permanent failures`);
      
      await supabase.from("notification_queue").insert({
        recipient_email: "admin@procannedu.com",
        subject: `⚠️ ${permanentFailures.length} Emails Permanently Failed`,
        message: `The following email addresses failed after 4 retry attempts:\n\n${permanentFailures.join("\n")}\n\nPlease investigate and contact recipients manually if needed.`,
        status: "pending",
        priority: "high",
        metadata: {
          type: "email_permanent_failure",
          failed_emails: permanentFailures,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const summary = {
      emails_checked: failedEmails?.length || 0,
      emails_retried: retriedCount,
      emails_succeeded: successCount,
      emails_still_failed: retriedCount - successCount,
      permanent_failures: permanentFailures.length,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Retry process complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Auto-retry error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
