import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CompetitorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  website: z.string().url().max(500),
  pricingModel: z.string().max(100).optional(),
  price: z.number().positive().max(10000).optional(),
  features: z.array(z.string().max(100)).max(50).optional(),
  position: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  id: z.string().uuid().optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const body = await req.json();
    const { action, competitor } = body;

    if (!action || !competitor) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, competitor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate competitor data
    const validatedCompetitor = CompetitorSchema.parse(competitor);

    console.log(`Managing competitor - Action: ${action}`);

    if (action === 'create') {
      const { data, error } = await supabase
        .from('competitor_snapshots')
        .insert({
          competitor_name: validatedCompetitor.name,
          website_url: validatedCompetitor.website,
          pricing_model: validatedCompetitor.pricingModel,
          price_per_student: validatedCompetitor.price,
          features_detected: validatedCompetitor.features || [],
          market_position: validatedCompetitor.position,
          notes: validatedCompetitor.notes
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
      if (!validatedCompetitor.id) {
        return new Response(
          JSON.stringify({ error: 'Missing competitor id for update' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('competitor_snapshots')
        .update({
          competitor_name: validatedCompetitor.name,
          website_url: validatedCompetitor.website,
          pricing_model: validatedCompetitor.pricingModel,
          price_per_student: validatedCompetitor.price,
          features_detected: validatedCompetitor.features || [],
          market_position: validatedCompetitor.position,
          notes: validatedCompetitor.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedCompetitor.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      if (!validatedCompetitor.id) {
        return new Response(
          JSON.stringify({ error: 'Missing competitor id for delete' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { error } = await supabase
        .from('competitor_snapshots')
        .delete()
        .eq('id', validatedCompetitor.id);

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
