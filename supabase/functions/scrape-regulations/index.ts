import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    console.log('Starting regulatory scraping...');
    
    const url = 'https://regulations.justia.com/states/maryland/title-14/subtitle-17/';
    
    // Fetch the HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ProCann-Education-Bot/1.0 (Compliance Monitoring)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Fetched ${html.length} characters from Justia`);
    
    // Basic HTML parsing - extract sections
    const sections = parseComarSections(html);
    console.log(`Parsed ${sections.length} sections`);
    
    let changesDetected = 0;
    
    for (const section of sections) {
      // Generate hash of content
      const encoder = new TextEncoder();
      const data = encoder.encode(section.content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Check if this section exists
      const { data: existing } = await supabase
        .from('regulatory_content')
        .select('version_hash, content_text')
        .eq('section_number', section.number)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!existing || existing.version_hash !== hash) {
        changesDetected++;
        console.log(`Change detected in section ${section.number}`);
        
        // Insert new version
        await supabase.from('regulatory_content').insert({
          section_number: section.number,
          section_title: section.title,
          content_text: section.content,
          source_url: url,
          version_hash: hash,
          last_modified_at: new Date().toISOString()
        });
        
        // Log the update
        await supabase.from('regulatory_updates').insert({
          section_number: section.number,
          change_type: existing ? 'modified' : 'added',
          previous_content: existing?.content_text || null,
          new_content: section.content,
          detected_at: new Date().toISOString()
        });
        
        // Trigger AI analysis
        try {
          await supabase.functions.invoke('analyze-regulatory-impact', {
            body: { 
              section_number: section.number,
              old_content: existing?.content_text,
              new_content: section.content
            }
          });
        } catch (aiError) {
          console.error('AI analysis failed:', aiError);
        }
      }
    }
    
    console.log(`Scraping complete. ${changesDetected} changes detected.`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sections_checked: sections.length,
        changes_detected: changesDetected
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error('Error in scrape-regulations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function parseComarSections(html: string) {
  const sections: Array<{number: string, title: string, content: string}> = [];
  
  // Basic regex parsing - extract section patterns
  const sectionPattern = /COMAR\s+(\d+\.\d+\.\d+\.\d+)/gi;
  const matches = html.matchAll(sectionPattern);
  
  for (const match of matches) {
    const sectionNum = match[1];
    const startIndex = match.index || 0;
    
    // Extract title (next 200 chars)
    const titleMatch = html.slice(startIndex, startIndex + 200).match(/<h[234]>(.*?)<\/h[234]>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Untitled Section';
    
    // Extract content (next 2000 chars, removing HTML)
    const content = html.slice(startIndex, startIndex + 2000)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (content.length > 50) { // Only add if substantial content
      sections.push({ number: sectionNum, title, content: content.slice(0, 1500) });
    }
  }
  
  return sections;
}
