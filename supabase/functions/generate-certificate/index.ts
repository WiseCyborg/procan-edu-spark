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

Deno.serve(async (req: Request) => {
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

    // Check rate limit for certificate generation (3 per hour)
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        _user_id: user.id,
        _action_type: 'certificate_generation',
        _max_requests: 3,
        _window_minutes: 60
      });

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Security check failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!rateLimitCheck) {
      // Log rate limit violation
      await supabase.rpc('log_security_event', {
        _event_type: 'rate_limit_violation',
        _details: {
          action: 'certificate_generation',
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        }
      });

      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. You can only generate 3 certificates per hour.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { exam_attempt_id, user_data, exam_results }: GenerateCertificateRequest = await req.json();

    // Log certificate generation attempt
    await supabase.rpc('log_security_event', {
      _event_type: 'certificate_generation_attempted',
      _details: {
        exam_attempt_id,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      }
    });

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

    // Log successful certificate generation
    await supabase.rpc('log_security_event', {
      _event_type: 'certificate_generation_completed',
      _details: {
        certificate_number: certificate.certificate_number,
        exam_attempt_id,
        course_id: examAttempt.course_id
      }
    });

    // Fetch user and course details for certificate email
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

    // Trigger certificate email (fire-and-forget)
    supabase.functions.invoke('send-certificate-email', {
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
    }).catch(err => console.error('Certificate email failed:', err));

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
});