import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateCertificateRequest {
  email: string;
  course_id: string;
  name?: string;
  enrollment_id?: string;
  session_id?: string;
  user_id?: string;
  completed_modules?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GenerateCertificateRequest = await req.json();
    const { email, course_id, name, enrollment_id, session_id, user_id, completed_modules } = body;

    if (!email || !course_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'email and course_id are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Generating consumer certificate for:', { email, course_id, enrollment_id, session_id, user_id });

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, completion_badge_name')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      throw new Error(`Course not found: ${courseError?.message}`);
    }

    const nowIso = new Date().toISOString();

    // Step 1-3: resolve or create the enrollment (all via service role)
    let resolvedEnrollmentId: string | null = null;

    if (enrollment_id) {
      const { data: existing } = await supabase
        .from('consumer_enrollments')
        .select('id, completed_at')
        .eq('id', enrollment_id)
        .maybeSingle();

      if (existing) {
        resolvedEnrollmentId = existing.id;
        if (!existing.completed_at) {
          await supabase
            .from('consumer_enrollments')
            .update({ completed_at: nowIso })
            .eq('id', existing.id);
        }
      }
    }

    if (!resolvedEnrollmentId) {
      let query = supabase
        .from('consumer_enrollments')
        .select('id, completed_at')
        .eq('course_id', course_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (user_id) {
        query = query.eq('user_id', user_id);
      } else if (session_id) {
        query = query.eq('session_id', session_id);
      } else {
        query = query.eq('email', email);
      }

      const { data: found } = await query.maybeSingle();
      if (found) {
        resolvedEnrollmentId = found.id;
        if (!found.completed_at) {
          await supabase
            .from('consumer_enrollments')
            .update({ completed_at: nowIso })
            .eq('id', found.id);
        }
      }
    }

    if (!resolvedEnrollmentId) {
      const insertRow: Record<string, any> = {
        course_id,
        email,
        started_at: nowIso,
        completed_at: nowIso,
        metadata: {
          courseId: course_id,
          name: name || undefined,
          completedModules: completed_modules || [],
          completedAt: nowIso,
        },
      };
      if (user_id) insertRow.user_id = user_id;
      if (session_id) insertRow.session_id = session_id;

      const { data: created, error: enrollErr } = await supabase
        .from('consumer_enrollments')
        .insert(insertRow)
        .select('id')
        .single();

      if (enrollErr || !created) {
        throw new Error(`Failed to create enrollment: ${enrollErr?.message}`);
      }
      resolvedEnrollmentId = created.id;
    }

    // Idempotency: return existing certificate if there is one for this enrollment
    const { data: existingCert } = await supabase
      .from('consumer_certificates')
      .select('id, certificate_number, badge_name, verification_url')
      .eq('enrollment_id', resolvedEnrollmentId)
      .maybeSingle();

    if (existingCert) {
      console.log('Existing consumer certificate found:', existingCert.certificate_number);
      return new Response(
        JSON.stringify({
          success: true,
          certificate: {
            id: existingCert.id,
            certificate_number: existingCert.certificate_number,
            badge_name: existingCert.badge_name,
            verification_url: existingCert.verification_url,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Generate unique certificate number (CON-YYYY-XXXXXX format)
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const certificate_number = `CON-${year}-${random}`;

    const verification_url = `https://www.procannedu.com/verify?code=${certificate_number}`;

    const { data: certificate, error: certError } = await supabase
      .from('consumer_certificates')
      .insert({
        enrollment_id: resolvedEnrollmentId,
        certificate_number,
        badge_name: course.completion_badge_name || 'Consumer Certified',
        recipient_name: name,
        recipient_email: email,
        course_title: course.title,
        verification_url,
        metadata: {
          course_id,
          generated_at: nowIso,
        },
      })
      .select()
      .single();

    if (certError) {
      throw new Error(`Failed to create certificate: ${certError.message}`);
    }

    console.log('Certificate created:', certificate.certificate_number);

    // Send certificate email (non-blocking)
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
        },
      });
    } catch (emailError) {
      console.error('Failed to send certificate email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificate.id,
          certificate_number: certificate.certificate_number,
          badge_name: certificate.badge_name,
          verification_url,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error generating consumer certificate:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
