import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Triggering regulatory content scrapers...');
    
    const results = {
      maryland_comar: { success: false, error: null },
      federal: { success: false, error: null },
    };

    // Trigger Maryland COMAR scraper
    try {
      const { data: comarData, error: comarError } = await supabase.functions.invoke('scrape-regulations', {});
      
      if (comarError) {
        results.maryland_comar.error = comarError.message;
      } else {
        results.maryland_comar.success = true;
        console.log('Maryland COMAR scraper completed:', comarData);
      }
    } catch (error) {
      results.maryland_comar.error = error.message;
    }

    // Trigger Federal regulations scraper
    try {
      const { data: federalData, error: federalError } = await supabase.functions.invoke('scrape-federal-regulations', {});
      
      if (federalError) {
        results.federal.error = federalError.message;
      } else {
        results.federal.success = true;
        console.log('Federal scraper completed:', federalData);
      }
    } catch (error) {
      results.federal.error = error.message;
    }

    // Check how many COMAR sections we now have
    const { count: comarCount } = await supabase
      .from('regulatory_content')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'Maryland');

    const { count: federalCount } = await supabase
      .from('federal_regulation_tracking')
      .select('*', { count: 'exact', head: true });

    console.log(`Database now contains: ${comarCount} COMAR sections, ${federalCount} federal records`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        database_counts: {
          maryland_comar_sections: comarCount,
          federal_records: federalCount,
        },
        message: 'Regulatory scrapers triggered successfully. Database is being populated with Maryland COMAR content.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error triggering scrapers:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Failed to trigger regulatory scrapers. Check function logs for details.',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
