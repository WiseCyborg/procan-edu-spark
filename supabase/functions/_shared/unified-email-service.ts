/**
 * Unified Email Service
 * 
 * Enforces consistent email formatting across ALL emails (customer + internal).
 * NO email can be sent without going through a template.
 */

import { EmailRouter } from "./email-router.ts";
import { loadEmailTemplate } from "./email-templates.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Standard variable names used across all templates
export interface StandardEmailVariables {
  // Core
  Subject?: string;
  Preheader?: string;
  Headline?: string;
  BodyHtml?: string;
  BodyText?: string;
  
  // CTA
  CtaText?: string;
  CtaUrl?: string;
  
  // Meta
  Environment?: string;
  SupportEmail?: string;
  Timestamp?: string;
  
  // Internal emails
  EventType?: string;
  EntityId?: string;
  AdminReviewUrl?: string;
  
  // Dynamic variables (template-specific)
  [key: string]: string | number | boolean | undefined;
}

export interface SendEmailOptions {
  templateName: string;
  to: string | string[];
  variables: StandardEmailVariables;
  from?: string;
  replyTo?: string;
  
  // Optional overrides
  subjectOverride?: string;
  skipLogging?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
  templateUsed: string;
  outboxId?: string;
}

// HTML to text converter for fallback
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// Get environment label
function getEnvironment(): string {
  const url = Deno.env.get("SUPABASE_URL") || "";
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return "LOCAL";
  }
  // Check for UAT indicators
  const isUAT = Deno.env.get("IS_UAT") === "true" || 
                Deno.env.get("ENVIRONMENT") === "uat" ||
                url.includes("uat");
  return isUAT ? "UAT" : "PROD";
}

// Get base URL for links
function getBaseUrl(): string {
  const customUrl = Deno.env.get("APP_BASE_URL");
  if (customUrl) return customUrl;
  
  const env = getEnvironment();
  if (env === "PROD") {
    return "https://procannedu.com";
  }
  return "https://39cb473a-8352-4078-beba-036700271ae3.lovableproject.com";
}

export class UnifiedEmailService {
  private supabase: any;
  private emailRouter: EmailRouter;
  
  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    this.emailRouter = new EmailRouter();
  }
  
  /**
   * Send an email using a template.
   * This is the ONLY way to send emails - enforces template usage.
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const startTime = Date.now();
    const outboxId = crypto.randomUUID();
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    
    console.log(`📧 [UNIFIED-EMAIL] Starting send for template: ${options.templateName}`);
    console.log(`📧 [UNIFIED-EMAIL] Recipients: ${recipients.join(", ")}`);
    
    try {
      // Step 1: Fetch template from database
      const { data: template, error: templateError } = await this.supabase
        .from("email_templates")
        .select("*")
        .eq("template_name", options.templateName)
        .eq("is_active", true)
        .single();
      
      if (templateError || !template) {
        const error = `Template "${options.templateName}" not found or inactive. NO EMAIL SENT.`;
        console.error(`❌ [UNIFIED-EMAIL] ${error}`);
        
        // Log failed attempt
        await this.logToOutbox(outboxId, {
          templateName: options.templateName,
          recipientEmail: recipients[0],
          subject: "TEMPLATE NOT FOUND",
          hasHtml: false,
          hasText: false,
          status: "template_missing",
          errorMessage: error,
        });
        
        return {
          success: false,
          error,
          templateUsed: options.templateName,
          outboxId,
        };
      }
      
      console.log(`✅ [UNIFIED-EMAIL] Template loaded: ${template.template_name}`);
      
      // Step 2: Enrich variables with standard meta
      const enrichedVariables: StandardEmailVariables = {
        ...options.variables,
        Environment: options.variables.Environment || getEnvironment(),
        Timestamp: options.variables.Timestamp || new Date().toISOString(),
        SupportEmail: options.variables.SupportEmail || "support@procannedu.com",
        BaseUrl: getBaseUrl(),
      };
      
      // Step 3: Render template
      let renderedHtml: string;
      try {
        renderedHtml = await loadEmailTemplate(options.templateName, enrichedVariables);
      } catch (renderError) {
        const error = `Failed to render template "${options.templateName}": ${renderError.message}`;
        console.error(`❌ [UNIFIED-EMAIL] ${error}`);
        
        await this.logToOutbox(outboxId, {
          templateName: options.templateName,
          recipientEmail: recipients[0],
          subject: template.subject_line,
          hasHtml: false,
          hasText: false,
          status: "render_failed",
          errorMessage: error,
        });
        
        return {
          success: false,
          error,
          templateUsed: options.templateName,
          outboxId,
        };
      }
      
      // Step 4: Validate rendered HTML
      if (!renderedHtml || renderedHtml.length < 50) {
        const error = "Rendered HTML is empty or too short. Refusing to send.";
        console.error(`❌ [UNIFIED-EMAIL] ${error}`);
        
        await this.logToOutbox(outboxId, {
          templateName: options.templateName,
          recipientEmail: recipients[0],
          subject: template.subject_line,
          hasHtml: false,
          hasText: false,
          status: "validation_failed",
          errorMessage: error,
        });
        
        return {
          success: false,
          error,
          templateUsed: options.templateName,
          outboxId,
        };
      }
      
      // Step 5: Generate text version
      const textContent = htmlToText(renderedHtml);
      
      // Step 6: Render subject line
      let subject = options.subjectOverride || template.subject_line;
      for (const [key, value] of Object.entries(enrichedVariables)) {
        if (value !== undefined && value !== null) {
          subject = subject.replace(new RegExp(`\\{\\{\\s*\\.${key}\\s*\\}\\}`, 'g'), String(value));
        }
      }
      
      // Step 7: Extract CTA URL for logging
      const ctaMatch = renderedHtml.match(/href="([^"]+)"[^>]*>.*?(?:Review|View|Start|Continue|Complete|Download)/i);
      const ctaUrl = ctaMatch ? ctaMatch[1] : null;
      
      // Step 8: Log to outbox (pending)
      await this.logToOutbox(outboxId, {
        templateName: options.templateName,
        recipientEmail: recipients[0],
        subject,
        hasHtml: true,
        hasText: !!textContent,
        ctaUrl,
        status: "sending",
        renderedAt: new Date().toISOString(),
        metadata: {
          category: template.category,
          requiresInternalBadge: template.requires_internal_badge,
          variableKeys: Object.keys(enrichedVariables),
        },
      });
      
      // Step 9: Send email via router
      const results: SendEmailResult[] = [];
      
      for (const recipient of recipients) {
        const result = await this.emailRouter.sendWithFailover({
          to: recipient,
          subject,
          html: renderedHtml,
          from: options.from,
          metadata: {
            email_type: template.category || "customer",
            template_name: options.templateName,
            outbox_id: outboxId,
          },
        }, this.supabase);
        
        if (result.success) {
          console.log(`✅ [UNIFIED-EMAIL] Sent to ${recipient} via ${result.provider}`);
        } else {
          console.error(`❌ [UNIFIED-EMAIL] Failed to send to ${recipient}: ${result.error}`);
        }
        
        results.push({
          success: result.success,
          messageId: result.providerId,
          provider: result.provider,
          error: result.error,
          templateUsed: options.templateName,
          outboxId,
        });
      }
      
      // Step 10: Update outbox with final status
      const allSuccess = results.every(r => r.success);
      const firstResult = results[0];
      
      await this.supabase.from("email_outbox").update({
        status: allSuccess ? "sent" : "failed",
        provider: firstResult?.provider,
        provider_message_id: firstResult?.messageId,
        error_message: firstResult?.error,
        sent_at: allSuccess ? new Date().toISOString() : null,
      }).eq("id", outboxId);
      
      const responseTime = Date.now() - startTime;
      console.log(`📧 [UNIFIED-EMAIL] Completed in ${responseTime}ms. Success: ${allSuccess}`);
      
      return {
        success: allSuccess,
        messageId: firstResult?.messageId,
        provider: firstResult?.provider,
        error: firstResult?.error,
        templateUsed: options.templateName,
        outboxId,
      };
      
    } catch (error: any) {
      console.error(`❌ [UNIFIED-EMAIL] Unexpected error:`, error);
      
      await this.logToOutbox(outboxId, {
        templateName: options.templateName,
        recipientEmail: recipients[0],
        subject: "ERROR",
        hasHtml: false,
        hasText: false,
        status: "error",
        errorMessage: error.message,
      });
      
      return {
        success: false,
        error: error.message,
        templateUsed: options.templateName,
        outboxId,
      };
    }
  }
  
  /**
   * Preview an email without sending (for QA/testing)
   */
  async preview(templateName: string, variables: StandardEmailVariables): Promise<{
    html: string;
    text: string;
    subject: string;
    templateFound: boolean;
  }> {
    try {
      const { data: template } = await this.supabase
        .from("email_templates")
        .select("*")
        .eq("template_name", templateName)
        .eq("is_active", true)
        .single();
      
      if (!template) {
        return {
          html: "",
          text: "",
          subject: "",
          templateFound: false,
        };
      }
      
      const enrichedVariables = {
        ...variables,
        Environment: variables.Environment || getEnvironment(),
        Timestamp: variables.Timestamp || new Date().toISOString(),
        SupportEmail: "support@procannedu.com",
        BaseUrl: getBaseUrl(),
      };
      
      const html = await loadEmailTemplate(templateName, enrichedVariables);
      const text = htmlToText(html);
      
      let subject = template.subject_line;
      for (const [key, value] of Object.entries(enrichedVariables)) {
        if (value !== undefined && value !== null) {
          subject = subject.replace(new RegExp(`\\{\\{\\s*\\.${key}\\s*\\}\\}`, 'g'), String(value));
        }
      }
      
      return {
        html,
        text,
        subject,
        templateFound: true,
      };
    } catch (error) {
      console.error(`Preview error:`, error);
      return {
        html: "",
        text: "",
        subject: "",
        templateFound: false,
      };
    }
  }
  
  /**
   * List all available templates
   */
  async listTemplates(): Promise<Array<{
    name: string;
    subject: string;
    category: string;
    isActive: boolean;
  }>> {
    const { data } = await this.supabase
      .from("email_templates")
      .select("template_name, subject_line, category, is_active")
      .order("template_name");
    
    return (data || []).map((t: any) => ({
      name: t.template_name,
      subject: t.subject_line,
      category: t.category || "customer",
      isActive: t.is_active,
    }));
  }
  
  private async logToOutbox(id: string, data: {
    templateName: string;
    recipientEmail: string;
    subject: string;
    hasHtml: boolean;
    hasText: boolean;
    ctaUrl?: string | null;
    status: string;
    errorMessage?: string;
    renderedAt?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.supabase.from("email_outbox").upsert({
        id,
        template_name: data.templateName,
        recipient_email: data.recipientEmail,
        subject: data.subject,
        has_html: data.hasHtml,
        has_text: data.hasText,
        cta_url: data.ctaUrl,
        environment: getEnvironment(),
        status: data.status,
        error_message: data.errorMessage,
        rendered_at: data.renderedAt,
        metadata: data.metadata || {},
      });
    } catch (error) {
      console.error(`Failed to log to outbox:`, error);
    }
  }
}

// Convenience function for quick sends
export async function sendTemplatedEmail(
  templateName: string,
  to: string | string[],
  variables: StandardEmailVariables,
  options?: Partial<SendEmailOptions>
): Promise<SendEmailResult> {
  const service = new UnifiedEmailService();
  return service.send({
    templateName,
    to,
    variables,
    ...options,
  });
}
