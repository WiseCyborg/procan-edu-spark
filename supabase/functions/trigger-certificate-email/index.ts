import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { certificateId } = await req.json();
    console.log(`Triggering certificate email for certificate ${certificateId}`);

    // Get certificate details
    const { data: certificate } = await supabase
      .from("certificates")
      .select(`
        *,
        profiles!inner(first_name, last_name, user_id),
        courses!inner(title)
      `)
      .eq("id", certificateId)
      .single();

    if (!certificate) {
      throw new Error("Certificate not found");
    }

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(certificate.user_id);

    if (!authUser?.user?.email) {
      throw new Error("User email not found");
    }

    // Send certificate email
    const { error: emailError } = await supabase.functions.invoke("send-certificate-email", {
      body: {
        email: authUser.user.email,
        firstName: certificate.profiles.first_name,
        certificateNumber: certificate.certificate_number,
        downloadURL: `https://www.procannedu.com/certificates?id=${certificate.id}`,
        courseName: certificate.courses.title,
        issueDate: certificate.issue_date,
        expiryDate: certificate.expiry_date,
      },
    });

    if (emailError) {
      console.error("Failed to send certificate email:", emailError);
      throw emailError;
    }

    console.log(`Certificate email sent successfully to ${authUser.user.email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Certificate email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in trigger-certificate-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
