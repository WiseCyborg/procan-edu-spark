import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  latencyMs?: number;
}

export class SMTPEmailService {
  private client: SMTPClient;
  private fromAddress: string;

  constructor() {
    const hostname = Deno.env.get("SMTP_HOSTNAME");
    const port = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const username = Deno.env.get("SMTP_USERNAME");
    const password = Deno.env.get("SMTP_PASSWORD");
    this.fromAddress = Deno.env.get("SMTP_FROM") || "noreply@procannedu.com";

    if (!hostname || !username || !password) {
      throw new Error("SMTP configuration missing. Please set SMTP_HOSTNAME, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM secrets.");
    }

    this.client = new SMTPClient({
      connection: {
        hostname,
        port,
        tls: port === 465,
        auth: {
          username,
          password,
        },
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const startTime = Date.now();
    
    try {
      await this.client.send({
        from: options.from || this.fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        content: "auto",
        html: options.html,
      });

      const latencyMs = Date.now() - startTime;

      console.log(`Email sent successfully to ${options.to} in ${latencyMs}ms`);

      return {
        success: true,
        messageId: `smtp-${Date.now()}`,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error("SMTP send error:", error);

      return {
        success: false,
        error: error.message || "Unknown SMTP error",
        latencyMs,
      };
    }
  }

  async testConnection(): Promise<EmailResult> {
    const startTime = Date.now();
    
    try {
      // Send a test email to verify connection
      await this.client.send({
        from: this.fromAddress,
        to: [this.fromAddress],
        subject: "SMTP Connection Test",
        content: "auto",
        html: "<p>This is a test email to verify SMTP configuration.</p>",
      });

      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        messageId: `test-${Date.now()}`,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error("SMTP connection test failed:", error);

      return {
        success: false,
        error: error.message || "Unknown SMTP error",
        latencyMs,
      };
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.close();
    } catch (error) {
      console.error("Error closing SMTP connection:", error);
    }
  }
}
