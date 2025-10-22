import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FEDERAL_SOURCES = [
  {
    name: 'DEA Drug Scheduling',
    url: 'https://www.dea.gov/drug-information/drug-scheduling',
    type: 'federal_scheduling'
  },
  {
    name: 'Federal Register Cannabis',
    url: 'https://www.federalregister.gov/documents/search?conditions%5Bterm%5D=cannabis',
    type: 'federal_register'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting federal regulation scraping...');
    
    let totalChanges = 0;
    
    for (const source of FEDERAL_SOURCES) {
      console.log(`Scraping ${source.name}...`);
      
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'ProCann-Education-Bot/1.0 (Compliance Monitoring)'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch ${source.name}: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const content = extractRelevantContent(html, source.type);
      
      // Generate hash
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Check for changes
      const { data: existing } = await supabase
        .from('federal_regulation_tracking')
        .select('content_hash, content_text')
        .eq('source_name', source.name)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!existing || existing.content_hash !== hash) {
        totalChanges++;
        
        // Log change
        await supabase.from('federal_regulation_tracking').insert({
          source_name: source.name,
          source_url: source.url,
          source_type: source.type,
          content_text: content,
          content_hash: hash,
          checked_at: new Date().toISOString()
        });
        
        // Trigger AI analysis if content changed significantly
        if (existing) {
          await supabase.functions.invoke('analyze-regulatory-impact', {
            body: {
              section_number: `FEDERAL_${source.type}`,
              old_content: existing.content_text,
              new_content: content,
              is_federal: true
            }
          });
        }
        
        console.log(`Change detected in ${source.name}`);
      }
    }
    
    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Federal Regulation Scraper',
      agent_type: 'regulatory_monitor',
      execution_status: 'success',
      items_processed: FEDERAL_SOURCES.length,
      changes_detected: totalChanges,
      actions_taken: totalChanges > 0 ? ['regulatory_changes_detected', 'ai_analysis_triggered'] : [],
      metadata: { sources: FEDERAL_SOURCES.map(s => s.name) }
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sources_checked: FEDERAL_SOURCES.length,
        changes_detected: totalChanges
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in scrape-federal-regulations:', error);
    
    // Log failed run
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Federal Regulation Scraper',
      agent_type: 'regulatory_monitor',
      execution_status: 'failed',
      error_message: error.message
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function extractRelevantContent(html: string, type: string): string {
  // Remove script tags, extract text, focus on cannabis-related content
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract cannabis-related sections (first 5000 chars for analysis)
  const cannabisIndex = cleaned.toLowerCase().indexOf('cannabis');
  if (cannabisIndex > -1) {
    return cleaned.slice(Math.max(0, cannabisIndex - 500), cannabisIndex + 4500);
  }
  
  return cleaned.slice(0, 5000);
}
