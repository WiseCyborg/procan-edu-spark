// Issue 1001 — Public read-only endpoint used by Payment.tsx and PaymentSuccess.tsx
// Returns ONLY safe fields about an application's approval + payment state.
// No auth required because the application_id itself is the bearer token (UUID, hard to guess).
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PRICE_PER_SEAT, deriveQuantity } from "../_shared/payment-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { application_id } = await req.json().catch(() => ({} as any));
    if (!application_id) {
      return json({ success: false, error_code: "MISSING_APPLICATION_ID" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: app, error } = await supabase
      .from("dispensary_applications")
      .select(
        "id, organization_name, contact_person, contact_email, estimated_employees, requested_credits, application_status, payment_status"
      )
      .eq("id", application_id)
      .maybeSingle();

    if (error || !app) {
      return json({ success: false, error_code: "NOT_FOUND" });
    }

    const quantity = deriveQuantity({
      estimated_employees: app.estimated_employees,
      requested_credits: app.requested_credits,
    });

    // Mask contact_email for privacy (scenario 4: stranger viewing link)
    const maskedEmail = (app.contact_email || "")
      .replace(/^(.{2}).*(@.*)$/, "$1***$2");

    return json({
      success: true,
      application: {
        id: app.id,
        organization_name: app.organization_name,
        contact_person_initial: (app.contact_person || "?").charAt(0),
        contact_email_masked: maskedEmail,
        application_status: app.application_status,
        payment_status: app.payment_status,
        quantity,
        price_per_seat: PRICE_PER_SEAT,
        total_amount: quantity * PRICE_PER_SEAT,
      },
    });
  } catch (err: any) {
    return json({ success: false, error_code: "INTERNAL_ERROR", error: err?.message }, 500);
  }
});
