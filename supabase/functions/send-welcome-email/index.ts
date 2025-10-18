
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client for logging
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();
    
    // Check if welcome email was already sent in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: existingLogs, error: checkError } = await supabase
      .from('email_logs')
      .select('id')
      .eq('recipient_email', email)
      .eq('email_type', 'welcome')
      .eq('status', 'sent')
      .gte('sent_at', oneDayAgo)
      .limit(1)

    if (checkError) {
      console.error('Error checking email logs:', checkError)
    }

    if (existingLogs && existingLogs.length > 0) {
      console.log(`Welcome email already sent to ${email} in the last 24 hours, skipping`)
      return new Response(JSON.stringify({ 
        message: 'Welcome email already sent recently',
        skipped: true 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("Sending welcome email to:", email);

    // Log email attempt
    const { data: logData, error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: email,
        email_type: 'welcome',
        status: 'sending',
        subject: 'Welcome to ProCann Edu - Your Cannabis Training Journey Begins!'
      })
      .select('id')
      .single()

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <no-reply@procannedu.com>",
      to: [email],
      subject: "Welcome to ProCann Edu - Maryland Cannabis Training",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F9F7EE;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #2A7F3F 0%, #FFB300 50%, #C62828 100%); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 40px;">🌱</span>
            </div>
            <h1 style="color: #2A7F3F; font-size: 32px; margin-bottom: 10px; font-weight: bold;">Welcome to ProCann Edu</h1>
            <p style="color: #1E1E1E; font-size: 16px; font-weight: bold;">The Heartbeat of Responsible Cannabis Education in Maryland</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #2A7F3F;">
            <h2 style="color: #1E1E1E; margin-bottom: 15px; font-size: 20px;">Hello ${firstName} ${lastName || ''}!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 15px;">
              Thank you for joining ProCann Edu, Maryland's premier cannabis training platform. 
              You're now ready to begin your journey toward becoming a certified cannabis professional.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Our comprehensive training program teaches the <strong>Stoplight Standard™</strong> — 
              a revolutionary approach to responsible cannabis dosage that protects consumers 
              and empowers vendors with clear, color-coded guidance.
            </p>
          </div>
          
          <div style="background: linear-gradient(135deg, #2A7F3F 0%, #FFB300 50%, #C62828 100%); padding: 3px; border-radius: 12px; margin-bottom: 25px;">
            <div style="background: white; padding: 25px; border-radius: 10px;">
              <h3 style="color: #1E1E1E; margin-bottom: 15px; font-size: 18px;">🚦 The Stoplight Standard™</h3>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 15px;">
                Learn our three-tier dosage system that's transforming cannabis safety:
              </p>
              <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px; margin: 0;">
                <li><strong style="color: #2A7F3F;">🟢 Green Tier:</strong> Beginner-friendly products (5mg THC or less)</li>
                <li><strong style="color: #FFB300;">🟡 Yellow Tier:</strong> Intermediate experiences (5-10mg THC)</li>
                <li><strong style="color: #C62828;">🔴 Red Tier:</strong> Advanced consumer products (10mg+ THC)</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1E1E1E; margin-bottom: 15px;">What's Next?</h3>
            <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Complete your profile setup</li>
              <li style="margin-bottom: 8px;">Explore the Stoplight Standard™ methodology</li>
              <li style="margin-bottom: 8px;">Progress through all 18 comprehensive modules</li>
              <li style="margin-bottom: 8px;">Pass the final exam to earn your MCA-compliant certificate</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.procannedu.com/stoplight-standard" 
               style="background: #FFB300; color: #1E1E1E; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px; font-size: 16px;">
              Learn the Stoplight Standard™
            </a>
            <a href="https://www.procannedu.com/course" 
               style="background: #2A7F3F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Start Your Training
            </a>
          </div>
          
          <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #1E1E1E; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
              The Heartbeat of Responsible Cannabis Education in Maryland
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
              Questions? Contact our support team at info@procannedu.com
            </p>
            <p style="color: #9ca3af; font-size: 12px;">
              ProCann Edu • In accordance with the Maryland Cannabis Administration
            </p>
          </div>
        </div>
      `,
    });

    // Update email log with success/failure
    if (logData?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: emailResponse.data ? 'sent' : 'failed',
          provider_id: emailResponse.data?.id,
          sent_at: emailResponse.data ? new Date().toISOString() : null
        })
        .eq('id', logData.id)
    }

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
