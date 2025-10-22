import { Resend } from "npm:resend@2.0.0";

export class EmailService {
  private resend: Resend;
  
  constructor() {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    this.resend = new Resend(apiKey);
  }
  
  async send(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    try {
      const result = await this.resend.emails.send({
        from: options.from || "ProCann Edu <noreply@procannedu.com>",
        to: options.to,
        subject: options.subject,
        html: options.html
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error("Email send error:", error);
      return { success: false, error };
    }
  }
}
