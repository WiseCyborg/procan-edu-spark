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
    const { job_type, before_date } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`🗑️ Clearing dead-letter queue for job_type: ${job_type || 'all'}, before: ${before_date || 'all dates'}`);

    // Build the query
    let query = supabase.from("system_jobs_deadletter").select("*");

    if (job_type) {
      query = query.eq("job_type", job_type);
    }

    if (before_date) {
      query = query.lt("moved_to_dlq_at", before_date);
    }

    // Fetch matching jobs
    const { data: jobsToDelete, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    }

    if (!jobsToDelete || jobsToDelete.length === 0) {
      console.log("ℹ️ No jobs found matching criteria");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No jobs found to delete",
          deleted: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`📋 Found ${jobsToDelete.length} jobs to delete`);

    // Delete the jobs
    const jobIds = jobsToDelete.map((job) => job.id);

    const { error: deleteError } = await supabase
      .from("system_jobs_deadletter")
      .delete()
      .in("id", jobIds);

    if (deleteError) {
      throw new Error(`Failed to delete jobs: ${deleteError.message}`);
    }

    console.log(`✅ Successfully deleted ${jobsToDelete.length} jobs from dead-letter queue`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${jobsToDelete.length} jobs from dead-letter queue`,
        deleted: jobsToDelete.length,
        jobs: jobsToDelete.map((job) => ({
          id: job.id,
          job_type: job.job_type,
          moved_to_dlq_at: job.moved_to_dlq_at,
          payload: job.payload,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Fatal error in clear-deadletter-queue:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
