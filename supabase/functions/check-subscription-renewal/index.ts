import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting subscription renewal check...");

    // Find organizations with subscriptions expiring within different timeframes
    const now = new Date();
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: expiringOrgs, error: orgError } = await supabaseClient
      .from("organizations")
      .select(`
        id, 
        name, 
        subscription_tier, 
        subscription_end_date, 
        annual_price_cents
      `)
      .eq("admin_approved", true)
      .not("subscription_end_date", "is", null)
      .lte("subscription_end_date", in60Days.toISOString())
      .gte("subscription_end_date", now.toISOString());

    if (orgError) {
      console.error("Error fetching expiring organizations:", orgError);
      throw orgError;
    }

    console.log(`Found ${expiringOrgs?.length || 0} organizations with subscriptions expiring within 60 days`);

    const results = {
      processed: 0,
      reminders60Day: 0,
      reminders30Day: 0,
      reminders14Day: 0,
      reminders7Day: 0,
      errors: [] as string[],
    };

    for (const org of expiringOrgs || []) {
      try {
        const endDate = new Date(org.subscription_end_date);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        // Determine reminder type based on days remaining
        let reminderType: string | null = null;
        
        if (daysRemaining <= 7) {
          reminderType = "7_day";
          results.reminders7Day++;
        } else if (daysRemaining <= 14) {
          reminderType = "14_day";
          results.reminders14Day++;
        } else if (daysRemaining <= 30) {
          reminderType = "30_day";
          results.reminders30Day++;
        } else if (daysRemaining <= 60) {
          reminderType = "60_day";
          results.reminders60Day++;
        }

        if (!reminderType) continue;

        // Check if we already sent this reminder type
        const { data: existingReminder } = await supabaseClient
          .from("communication_logs")
          .select("id")
          .eq("organization_id", org.id)
          .eq("communication_type", `subscription_renewal_${reminderType}`)
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingReminder && existingReminder.length > 0) {
          console.log(`Already sent ${reminderType} reminder to ${org.name} today`);
          continue;
        }

        // Get organization manager email
        const { data: manager } = await supabaseClient
          .from("profiles")
          .select("email_cache, first_name, user_id")
          .eq("organization_id", org.id)
          .limit(1)
          .single();

        if (!manager?.email_cache) {
          console.log(`No manager email found for ${org.name}`);
          continue;
        }

        // Log the communication (actual email sending would be handled by email-router)
        await supabaseClient.from("communication_logs").insert({
          communication_type: `subscription_renewal_${reminderType}`,
          recipient_email: manager.email_cache,
          subject: `Your ProCann Edu subscription expires in ${daysRemaining} days`,
          organization_id: org.id,
          user_id: manager.user_id,
          metadata: {
            daysRemaining,
            tierName: org.subscription_tier,
            annualPrice: org.annual_price_cents,
            expiryDate: org.subscription_end_date,
          },
          delivery_status: "queued",
        });

        console.log(`Queued ${reminderType} renewal reminder for ${org.name} (${daysRemaining} days left)`);
        results.processed++;

      } catch (error: any) {
        console.error(`Error processing org ${org.id}:`, error);
        results.errors.push(`${org.name}: ${error.message}`);
      }
    }

    console.log("Subscription renewal check complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-subscription-renewal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
