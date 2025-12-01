import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateCertificateRequest {
  enrollment_id: string;
  email: string;
  name?: string;
  course_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { enrollment_id, email, name, course_id }: GenerateCertificateRequest = await req.json();

    console.log('Generating consumer certificate for:', { enrollment_id, email, course_id });

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, completion_badge_name')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      throw new Error(`Course not found: ${courseError?.message}`);
    }

    // Generate unique certificate number (CON-YYYY-XXXXXX format)
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const certificate_number = `CON-${year}-${random}`;

    // Create verification URL
    const verification_url = `https://www.procannedu.com/verify-certificate?cert=${certificate_number}`;

    // Insert certificate record
    const { data: certificate, error: certError } = await supabase
      .from('consumer_certificates')
      .insert({
        enrollment_id,
        certificate_number,
        badge_name: course.completion_badge_name || 'Consumer Certified',
        recipient_name: name,
        recipient_email: email,
        course_title: course.title,
        verification_url,
        metadata: {
          course_id,
          generated_at: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (certError) {
      throw new Error(`Failed to create certificate: ${certError.message}`);
    }

    console.log('Certificate created:', certificate.certificate_number);

    // Send certificate email
    try {
      await supabase.functions.invoke('send-consumer-certificate-email', {
        body: {
          email,
          name,
          badge_name: certificate.badge_name,
          course_title: course.title,
          certificate_number: certificate.certificate_number,
          verification_url,
          issue_date: certificate.issue_date,
        }
      });
    } catch (emailError) {
      console.error('Failed to send certificate email:', emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificate.id,
          certificate_number: certificate.certificate_number,
          badge_name: certificate.badge_name,
          verification_url,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating consumer certificate:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
