import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JoinCodeSchema = z.object({
  code: z.string().trim().min(3).max(50).regex(/^[A-Z0-9-]+$/i, 'Invalid join code format')
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validated = JoinCodeSchema.parse(body);
    const { code } = validated;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Validate join code
    const { data: joinCode, error } = await supabase
      .from("rvt_join_codes")
      .select("*, organizations(*)")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !joinCode) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Invalid or expired join code" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check expiry
    if (new Date(joinCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Join code has expired" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check max uses
    if (joinCode.max_uses && joinCode.current_uses >= joinCode.max_uses) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Join code usage limit reached" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check seat availability
    const { data: hasSeats, error: seatError } = await supabase.rpc('check_seat_availability', {
      org_id: joinCode.organization_id,
      course_id: null // Will use default course
    });

    if (seatError) {
      console.error('Error checking seat availability:', seatError);
    }

    if (!hasSeats) {
      // Get manager contact info
      const { data: managerProfile } = await supabase
        .from('user_roles')
        .select('profiles(first_name, last_name, email)')
        .eq('role', 'dispensary_manager')
        .limit(1)
        .maybeSingle();

      const managerName = managerProfile?.profiles 
        ? `${managerProfile.profiles.first_name} ${managerProfile.profiles.last_name}`
        : 'your manager';
      const managerEmail = managerProfile?.profiles?.email || '';

      return new Response(JSON.stringify({ 
        valid: false, 
        error: "No available training seats",
        message: `Your organization has no available training seats. Please contact ${managerName}${managerEmail ? ` at ${managerEmail}` : ''} to purchase more seats.`,
        organizationName: joinCode.organizations.name,
        managerName,
        managerEmail
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      valid: true,
      organizationId: joinCode.organization_id,
      organizationName: joinCode.organizations.name
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in validate-join-code:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
