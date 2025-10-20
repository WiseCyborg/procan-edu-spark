
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { loadEmailTemplate } from "../_shared/email-templates.ts";
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

    // Load and render the welcome template
    const html = await loadEmailTemplate('welcome', {
      FirstName: firstName,
      DashboardURL: 'https://www.procannedu.com/dashboard',
    });

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <noreply@procannedu.com>",
      to: [email],
      subject: "Welcome to ProCann Edu! 🎓",
      html,
    });

    // Update email log with success/failure
    if (logData?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: emailResponse.data?.id ? 'sent' : 'failed',
          provider_id: emailResponse.data?.id,
          sent_at: new Date().toISOString(),
          error: emailResponse.error ? JSON.stringify(emailResponse.error) : null
        })
        .eq('id', logData.id)
    }

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
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
