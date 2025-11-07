import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, competitor } = await req.json();

    console.log(`Managing competitor - Action: ${action}`);

    if (action === 'create') {
      const { data, error } = await supabase
        .from('competitor_snapshots')
        .insert({
          competitor_name: competitor.name,
          website_url: competitor.website,
          pricing_model: competitor.pricingModel,
          price_per_student: competitor.price,
          features_detected: competitor.features || [],
          market_position: competitor.position,
          notes: competitor.notes
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      const { data, error } = await supabase
        .from('competitor_snapshots')
        .update({
          competitor_name: competitor.name,
          website_url: competitor.website,
          pricing_model: competitor.pricingModel,
          price_per_student: competitor.price,
          features_detected: competitor.features || [],
          market_position: competitor.position,
          notes: competitor.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', competitor.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('competitor_snapshots')
        .delete()
        .eq('id', competitor.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in manage-competitor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
