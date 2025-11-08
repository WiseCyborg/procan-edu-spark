import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EmailRouter } from "../_shared/email-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitationId, type } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (type === "staff") {
      // Resend staff invitation
      const { data: invitation } = await supabase
        .from("staff_invitations")
        .select("*, organizations(name)")
        .eq("id", invitationId)
        .single();

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Call the existing send-invitation-email function
      const result = await supabase.functions.invoke("send-invitation-email", {
        body: {
          email: invitation.email,
          organizationName: invitation.organizations?.name,
          inviterName: "ProCann Edu",
          role: invitation.role,
          invitationToken: invitation.token,
          expiryDate: invitation.expires_at,
          isReminder: true,
        },
      });

      // Update last_sent_at
      await supabase
        .from("staff_invitations")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", invitationId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (type === "employee") {
      // Resend employee invitation
      const { data: enrollment } = await supabase
        .from("rvt_enrollments")
        .select("*, rvt_seats(organization_id, organizations(name))")
        .eq("id", invitationId)
        .single();

      if (!enrollment) {
        throw new Error("Enrollment not found");
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(
        enrollment.user_id
      );

      // Call send-employee-invitation function
      const result = await supabase.functions.invoke("send-employee-invitation", {
        body: {
          employeeEmail: authUser.user?.email,
          organizationName: enrollment.rvt_seats?.organizations?.name,
          invitationToken: crypto.randomUUID(),
          deadline: enrollment.deadline_at,
        },
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid invitation type");
  } catch (error) {
    console.error("Error resending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
