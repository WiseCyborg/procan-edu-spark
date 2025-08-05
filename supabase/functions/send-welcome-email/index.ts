
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email);

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <no-reply@procannedu.com>",
      to: [email],
      subject: "Welcome to ProCann Edu - Maryland Cannabis Training",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; font-size: 28px; margin-bottom: 10px;">Welcome to ProCann Edu</h1>
            <p style="color: #666; font-size: 16px;">Maryland Cannabis Training Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1f2937; margin-bottom: 15px;">Hello ${firstName} ${lastName}!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 15px;">
              Thank you for joining ProCann Edu, Maryland's premier cannabis training platform. 
              You're now ready to begin your journey toward becoming a certified cannabis professional.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Our comprehensive training program covers all aspects of Maryland cannabis regulations, 
              responsible vendor practices, and industry best practices.
            </p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">What's Next?</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Complete your profile setup</li>
              <li style="margin-bottom: 8px;">Start the Maryland Responsible Vendor Training (RVT)</li>
              <li style="margin-bottom: 8px;">Progress through all 18 modules</li>
              <li style="margin-bottom: 8px;">Take the final exam to earn your certificate</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.app')}/course" 
               style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Start Your Training
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
              Questions? Contact our support team at info@procannedu.com
            </p>
            <p style="color: #9ca3af; font-size: 12px;">
              ProCann Training • In accordance with the Maryland Cannabis Administration
            </p>
          </div>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
