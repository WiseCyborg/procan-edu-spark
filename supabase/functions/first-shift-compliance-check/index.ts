import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  first_shift_date: string;
  organization_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[first-shift-compliance-check] Starting compliance check...");

    // Get all employees with first_shift_date set
    const { data: employees, error: empError } = await supabase
      .from("profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        email,
        first_shift_date,
        organization_id
      `)
      .not("first_shift_date", "is", null)
      .not("organization_id", "is", null);

    if (empError) {
      console.error("[first-shift-compliance-check] Error fetching employees:", empError);
      throw empError;
    }

    console.log(`[first-shift-compliance-check] Found ${employees?.length || 0} employees with first_shift_date`);

    const alerts: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const employee of (employees as Employee[]) || []) {
      const firstShiftDate = new Date(employee.first_shift_date);
      firstShiftDate.setHours(0, 0, 0, 0);
      
      const daysUntilShift = Math.ceil((firstShiftDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check if employee has a valid certificate
      const { data: certificate } = await supabase
        .from("certificates")
        .select("id, expiry_date, is_revoked")
        .eq("user_id", employee.user_id)
        .eq("is_revoked", false)
        .or(`expiry_date.is.null,expiry_date.gt.${new Date().toISOString()}`)
        .limit(1)
        .single();

      const hasCertificate = !!certificate;

      // Check training progress
      const { data: progress } = await supabase
        .from("user_progress")
        .select("completed")
        .eq("user_id", employee.user_id);

      const totalModules = progress?.length || 0;
      const completedModules = progress?.filter(p => p.completed)?.length || 0;
      const trainingStatus = totalModules === 0 
        ? "not_started" 
        : completedModules === totalModules 
          ? "completed" 
          : `${completedModules}/${totalModules}`;

      // Check for existing unresolved alerts
      const { data: existingAlert } = await supabase
        .from("first_shift_compliance_alerts")
        .select("id")
        .eq("employee_user_id", employee.user_id)
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let alertType: string | null = null;

      if (daysUntilShift < 0 && !hasCertificate) {
        // Already working without certification
        alertType = "working_uncertified";
      } else if (daysUntilShift === 0 && !hasCertificate) {
        // First shift is today and not certified
        alertType = "deadline_passed";
      } else if (daysUntilShift > 0 && daysUntilShift <= 7 && !hasCertificate) {
        // Approaching deadline (within 7 days)
        alertType = "approaching_deadline";
      } else if (daysUntilShift > 0 && daysUntilShift <= 14 && trainingStatus === "not_started") {
        // Has time but hasn't started training
        alertType = "training_incomplete";
      }

      if (alertType && !existingAlert) {
        alerts.push({
          organization_id: employee.organization_id,
          employee_user_id: employee.user_id,
          alert_type: alertType,
          first_shift_date: employee.first_shift_date,
          training_status: trainingStatus,
          days_until_shift: daysUntilShift
        });
      }

      // Resolve alerts if employee is now certified
      if (hasCertificate && existingAlert) {
        await supabase
          .from("first_shift_compliance_alerts")
          .update({ resolved_at: new Date().toISOString() })
          .eq("id", existingAlert.id);
        
        console.log(`[first-shift-compliance-check] Resolved alert for user ${employee.user_id}`);
      }
    }

    // Insert new alerts
    if (alerts.length > 0) {
      const { error: insertError } = await supabase
        .from("first_shift_compliance_alerts")
        .insert(alerts);

      if (insertError) {
        console.error("[first-shift-compliance-check] Error inserting alerts:", insertError);
        throw insertError;
      }

      console.log(`[first-shift-compliance-check] Created ${alerts.length} new alerts`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: alerts.length,
        employees_checked: employees?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[first-shift-compliance-check] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
