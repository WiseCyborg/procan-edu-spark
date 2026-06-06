import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gate 10: Certificate retry mechanism
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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

    const { exam_attempt_id } = await req.json();

    console.log(`[CERT RETRY] Retrying certificate generation for exam: ${exam_attempt_id}`);

    // Verify exam attempt belongs to user and passed
    const { data: examAttempt, error: examError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', exam_attempt_id)
      .eq('user_id', user.id)
      .eq('is_passed', true)
      .single();

    if (examError || !examAttempt) {
      return new Response(
        JSON.stringify({ error: 'Invalid exam attempt or exam not passed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if certificate already exists
    const { data: existingCert, error: certCheckError } = await supabase
      .from('certificates')
      .select('*')
      .eq('exam_attempt_id', exam_attempt_id)
      .maybeSingle();

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
      throw new Error('Failed to generate certificate number');
    }

    // Calculate expiry date (2 years from issue)
    const issueDate = new Date();
    const expiryDate = new Date(issueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    // Create certificate with retry metadata
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
        metadata: {
          retry_attempt: true,
          retry_timestamp: new Date().toISOString(),
          original_failure: 'Manual retry requested'
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('[CERT RETRY] Certificate creation failed:', insertError);
      throw new Error('Failed to create certificate');
    }

    console.log('[CERT RETRY] Certificate created successfully:', certificate.certificate_number);

    // Fetch profile and course for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("id", examAttempt.course_id)
      .single();

    // Send certificate email
    await supabase.functions.invoke('send-certificate-email', {
      body: {
        email: user.email,
        firstName: profile?.first_name || 'Student',
        lastName: profile?.last_name || '',
        certificateNumber: certificate.certificate_number,
        courseTitle: course?.title || 'Maryland Responsible Vendor Training',
        issueDate: new Date(certificate.issue_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }).catch(err => console.error('[CERT RETRY] Email failed:', err));

    return new Response(
      JSON.stringify({
        certificate_number: certificate.certificate_number,
        issue_date: certificate.issue_date,
        expiry_date: certificate.expiry_date,
        message: 'Certificate generated successfully via retry'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('[CERT RETRY] Error:', error);
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from('certificate_generation_errors').insert({
        source: 'generate-certificate-retry',
        attempt_number: 2,
        error_message: error?.message || 'Unknown error',
        error_detail: { stack: error?.stack || null },
      });
    } catch (logErr) {
      console.error('[CERT RETRY] Failed to log certificate_generation_error:', logErr);
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});