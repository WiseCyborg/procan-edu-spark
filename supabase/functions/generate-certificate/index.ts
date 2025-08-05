import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateCertificateRequest {
  exam_attempt_id: string;
  user_data: {
    name: string;
    email: string;
    phone: string;
    ip: string;
    photo?: string;
  };
  exam_results: {
    total_score: number;
    total_questions: number;
    time_taken: number;
    passing_score: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { exam_attempt_id, user_data, exam_results }: GenerateCertificateRequest = await req.json();

    console.log(`Generating certificate for user ${user.id}, exam attempt ${exam_attempt_id}`);

    // Verify exam attempt belongs to user and passed
    const { data: examAttempt, error: examError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', exam_attempt_id)
      .eq('user_id', user.id)
      .eq('is_passed', true)
      .single();

    if (examError || !examAttempt) {
      console.error('Invalid exam attempt:', examError);
      return new Response(
        JSON.stringify({ error: 'Invalid exam attempt or exam not passed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('certificate_number')
      .eq('exam_attempt_id', exam_attempt_id)
      .single();

    if (existingCert) {
      return new Response(
        JSON.stringify({ 
          certificate_number: existingCert.certificate_number,
          message: 'Certificate already exists'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Generate certificate number
    const { data: certNumber, error: certError } = await supabase
      .rpc('generate_certificate_number');

    if (certError || !certNumber) {
      console.error('Error generating certificate number:', certError);
      throw new Error('Failed to generate certificate number');
    }

    // Calculate expiry date (2 years from issue)
    const issueDate = new Date();
    const expiryDate = new Date(issueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    // Create certificate record
    const { data: certificate, error: insertError } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        course_id: examAttempt.course_id,
        exam_attempt_id: exam_attempt_id,
        certificate_number: certNumber,
        issue_date: issueDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        is_revoked: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating certificate:', insertError);
      throw new Error('Failed to create certificate');
    }

    console.log('Certificate created successfully:', certificate.certificate_number);

    // Return certificate details
    return new Response(
      JSON.stringify({
        certificate_number: certificate.certificate_number,
        issue_date: certificate.issue_date,
        expiry_date: certificate.expiry_date,
        message: 'Certificate generated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error generating certificate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);