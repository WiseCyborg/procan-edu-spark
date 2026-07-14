import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EmailService } from "../_shared/email-service.ts";
import { loadEmailTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // --- Admin auth check ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse body ---
    const body = await req.json().catch(() => ({}));
    const examAttemptId: string | undefined = body?.exam_attempt_id;
    const certificateId: string | undefined = body?.certificate_id;

    if (!examAttemptId && !certificateId) {
      return new Response(
        JSON.stringify({ error: "exam_attempt_id or certificate_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Look up certificate ---
    let certQuery = supabase
      .from("certificates")
      .select("id, user_id, certificate_number, pdf_url, exam_attempt_id");
    if (certificateId) {
      certQuery = certQuery.eq("id", certificateId);
    } else {
      certQuery = certQuery.eq("exam_attempt_id", examAttemptId!);
    }
    const { data: cert, error: certErr } = await certQuery.maybeSingle();
    if (certErr || !cert) {
      return new Response(JSON.stringify({ error: "Certificate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Look up recipient profile ---
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", cert.user_id)
      .maybeSingle();

    const { data: authUser, error: authUserErr } = await supabase.auth.admin.getUserById(cert.user_id);
    const recipientEmail = authUser?.user?.email;

    if (profileErr || !profile || authUserErr || !recipientEmail) {
      return new Response(JSON.stringify({ error: "Recipient email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Render + send ---
    const html = await loadEmailTemplate("certificate", {
      FirstName: profile.first_name ?? "Student",
      CertificateNumber: cert.certificate_number ?? "",
      DownloadURL: cert.pdf_url ?? "https://www.procannedu.com/certificates",
    });

    const emailService = new EmailService();
    const result = await emailService.send({
      to: recipientEmail,
      subject: "Your ProCann Edu Certificate",
      html,
      email_type: "certificate",
      metadata: {
        certificate_id: cert.id,
        exam_attempt_id: cert.exam_attempt_id,
        resent_by: userData.user.id,
      },
    });

    // Log success (EmailService only logs failures)
    await supabase.from("email_logs").insert({
      recipient_email: recipientEmail,
      subject: "Your ProCann Edu Certificate",
      email_type: "certificate",
      status: "sent",
      provider: result.provider,
      provider_id: result.data?.id ?? null,
      sent_at: new Date().toISOString(),
      metadata: {
        certificate_id: cert.id,
        exam_attempt_id: cert.exam_attempt_id,
        resent_by: userData.user.id,
      },
    });

    return new Response(
      JSON.stringify({ success: true, provider: result.provider, provider_id: result.data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("resend-certificate error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
