// EmailService — honest send + failure logging.
//
// Uses a direct fetch() to the Resend REST API with an AbortController-based
// hard timeout so send() cannot hang and leave email_logs rows stuck in
// 'sending'. On failure we write a row to `email_logs` with status='failed'
// + error_message, and THROW so the outer handler returns a non-200 status.
//
// We do NOT write a success row here — every existing caller already inserts
// an email_logs row after `.send()` returns, so logging success here would
// produce duplicates.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface SendOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  email_type?: string;
  metadata?: Record<string, unknown>;
}

const RESEND_TIMEOUT_MS = 8000;

export class EmailService {
  private apiKey: string;

  constructor() {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.warn("⚠️ [EmailService] RESEND_API_KEY missing — sends will fail");
    }
    this.apiKey = apiKey ?? "";
  }

  async send(options: SendOptions) {
    const from = options.from || "ProCann Edu <noreply@procannedu.com>";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Resend API ${res.status}: ${errText}`);
      }

      const json = await res.json();
      if (!json?.id) {
        throw new Error(`Resend returned no id (response: ${JSON.stringify(json)})`);
      }

      return {
        success: true as const,
        data: json,
        provider: "resend" as const,
      };
    } catch (err: any) {
      const errMsg = err?.name === "AbortError"
        ? `Resend request timed out after ${RESEND_TIMEOUT_MS}ms`
        : (err?.message ?? String(err));

      console.error("[EmailService] send failed:", errMsg);

      // Persist failure to email_logs so admins can see + retry
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

      throw new Error(errMsg);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
