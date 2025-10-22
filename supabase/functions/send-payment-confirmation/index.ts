import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentConfirmationRequest {
  orderId: string;
  courseId: string;
  courseTitle: string;
  amount: string;
  currency: string;
  userEmail: string;
  userName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      orderId, 
      courseId, 
      courseTitle, 
      amount, 
      currency, 
      userEmail, 
      userName 
    }: PaymentConfirmationRequest = await req.json();

    console.log("Sending payment confirmation to:", userEmail);

    // Check if payment confirmation was already sent in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: existingLogs } = await supabase
      .from('email_logs')
      .select('id')
      .eq('recipient_email', userEmail)
      .eq('email_type', 'payment_confirmation')
      .eq('status', 'sent')
      .gte('sent_at', oneDayAgo)
      .limit(1);

    if (existingLogs && existingLogs.length > 0) {
      console.log(`Payment confirmation already sent to ${userEmail} recently, skipping`);
      return new Response(JSON.stringify({ 
        message: 'Payment confirmation already sent recently',
        skipped: true 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Log email attempt
    const { data: logData } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: userEmail,
        email_type: 'payment_confirmation',
        status: 'sending',
        subject: 'Payment Confirmed - Your ProCann Edu Course is Ready!'
      })
      .select('id')
      .single();

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <no-reply@procannedu.com>",
      to: [userEmail],
      subject: "✅ Payment Confirmed - Welcome to ProCann Edu!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F9F7EE;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: #2A7F3F; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 48px; color: white;">✓</span>
            </div>
            <h1 style="color: #2A7F3F; font-size: 32px; margin-bottom: 10px; font-weight: bold;">Payment Successful!</h1>
            <p style="color: #1E1E1E; font-size: 16px;">Your cannabis training journey begins now</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #2A7F3F;">
            <h2 style="color: #1E1E1E; margin-bottom: 20px; font-size: 20px;">Hello ${userName}!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Thank you for enrolling in <strong>${courseTitle}</strong>. Your payment has been confirmed 
              and you now have full access to all 18 modules of the Stoplight Standard™ training program.
            </p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #1E1E1E; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Order Details</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280;">Order ID:</span>
                <span style="color: #1E1E1E; font-family: monospace;">${orderId.substring(0, 12)}...</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280;">Amount Paid:</span>
                <span style="color: #2A7F3F; font-weight: bold;">${currency} $${amount}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Date:</span>
                <span style="color: #1E1E1E;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #2A7F3F 0%, #FFB300 50%, #C62828 100%); padding: 3px; border-radius: 12px; margin-bottom: 25px;">
            <div style="background: white; padding: 25px; border-radius: 10px;">
              <h3 style="color: #1E1E1E; margin-bottom: 15px; font-size: 18px;">🚦 The Stoplight Standard™</h3>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 15px;">
                You'll learn our revolutionary three-tier dosage system that's transforming cannabis safety in Maryland:
              </p>
              <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px; margin: 0;">
                <li><strong style="color: #2A7F3F;">🟢 Green Tier:</strong> Beginner-friendly products</li>
                <li><strong style="color: #FFB300;">🟡 Yellow Tier:</strong> Intermediate experiences</li>
                <li><strong style="color: #C62828;">🔴 Red Tier:</strong> Advanced consumer products</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1E1E1E; margin-bottom: 15px;">What's Next?</h3>
            <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Access all 18 training modules immediately</li>
              <li style="margin-bottom: 8px;">Progress through Green, Yellow, and Red tiers</li>
              <li style="margin-bottom: 8px;">Complete quizzes to test your knowledge</li>
              <li style="margin-bottom: 8px;">Pass the final exam to earn your MCA-compliant certificate</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.procannedu.com/course" 
               style="background: #2A7F3F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Start Your Training Journey
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #FFB300;">
            <p style="color: #78350f; font-size: 14px; line-height: 1.5; margin: 0;">
              <strong>💡 Pro Tip:</strong> Set aside 2-3 hours to complete your training at your own pace. 
              Your progress is automatically saved, so you can stop and resume anytime.
            </p>
          </div>
          
          <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #1E1E1E; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
              The Heartbeat of Responsible Cannabis Education in Maryland
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
              Questions? Contact info@procannedu.com
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
        .eq('id', logData.id);
    }

    console.log("Payment confirmation sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-payment-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
