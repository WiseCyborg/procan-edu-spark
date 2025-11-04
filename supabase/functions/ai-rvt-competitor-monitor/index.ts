import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MCA Approved RVT Providers (as of context)
const APPROVED_PROVIDERS = [
  {
    name: 'Bud Education',
    website: 'budeducation.com',
    email: 'kristi@budeducation.com',
    agent_types: ['Dispensary', 'Grower', 'Processor'],
    training_types: ['On Demand Virtual Modules']
  },
  {
    name: 'Cannabis Trainers LLC',
    website: 'cannabistrainers.com',
    email: 'info@cannabistrainers.com',
    agent_types: ['Dispensary', 'Grower', 'Processor'],
    training_types: ['Virtual Classroom', 'On Demand Virtual Modules']
  },
  {
    name: 'Green CulturED',
    website: 'greencultured.co',
    email: 'info@greencultured.com',
    agent_types: ['Dispensary', 'Grower', 'Processor'],
    training_types: ['On Demand Virtual Modules']
  },
  {
    name: 'Green Flower Media',
    website: 'www.green-flower.com',
    email: 'beth.hufford@greenfloweredu.com',
    agent_types: ['Dispensary'],
    training_types: ['On Demand Virtual Modules']
  },
  {
    name: 'Seed Talent',
    website: 'https://seedtalent.com/',
    email: 'sales@seedtalent.com',
    agent_types: ['Dispensary'],
    training_types: ['On Demand Virtual Modules']
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

    console.log('Starting RVT competitor intelligence monitoring...');
    
    let scannedCount = 0;
    let changesDetected = 0;
    let alertsCreated = 0;

    // Scan each competitor
    for (const competitor of APPROVED_PROVIDERS) {
      try {
        console.log(`Scanning ${competitor.name}...`);
        scannedCount++;

        // Fetch competitor website
        const response = await fetch(`https://${competitor.website.replace('https://', '')}`, {
          headers: {
            'User-Agent': 'ProCann-RVT-Monitor/1.0 (Compliance Tracking)'
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${competitor.name}: ${response.status}`);
          continue;
        }

        const html = await response.text();
        
        // Analyze content for key features
        const snapshot = {
          competitor_name: competitor.name,
          website: competitor.website,
          agent_types_approved: competitor.agent_types,
          training_types_approved: competitor.training_types,
          features_detected: extractFeatures(html),
          pricing_detected: extractPricing(html),
          claims_detected: extractClaims(html),
          snapshot_date: new Date().toISOString()
        };

        // Get previous snapshot
        const { data: previousSnapshot } = await supabase
          .from('competitor_snapshots')
          .select('*')
          .eq('competitor_name', competitor.name)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Save current snapshot
        await supabase.from('competitor_snapshots').insert({
          competitor_name: snapshot.competitor_name,
          website: snapshot.website,
          features_detected: snapshot.features_detected,
          pricing_info: snapshot.pricing_detected,
          metadata: {
            agent_types: snapshot.agent_types_approved,
            training_types: snapshot.training_types_approved,
            claims: snapshot.claims_detected
          },
          snapshot_date: snapshot.snapshot_date
        });

        // Detect changes
        if (previousSnapshot) {
          const changes = detectChanges(previousSnapshot, snapshot);
          
          for (const change of changes) {
            changesDetected++;
            console.log(`Change detected: ${change.description}`);

            // Create alert
            const { error: alertError } = await supabase
              .from('competitive_alerts')
              .insert({
                competitor_name: competitor.name,
                alert_type: change.type,
                severity: change.severity,
                description: change.description,
                metadata: change.metadata
              });

            if (!alertError) {
              alertsCreated++;
            }
          }
        }

      } catch (error) {
        console.error(`Error scanning ${competitor.name}:`, error);
      }
    }

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'RVT Competitor Monitor',
      agent_type: 'competitive_intelligence',
      execution_status: 'success',
      items_processed: scannedCount,
      changes_detected: changesDetected,
      actions_taken: { alerts_created: alertsCreated },
      metadata: {
        competitors_scanned: APPROVED_PROVIDERS.map(c => c.name)
      }
    });

    console.log(`RVT monitoring complete. Scanned: ${scannedCount}, Changes: ${changesDetected}, Alerts: ${alertsCreated}`);

    return new Response(
      JSON.stringify({
        success: true,
        competitors_scanned: scannedCount,
        changes_detected: changesDetected,
        alerts_created: alertsCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in RVT competitor monitor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function extractFeatures(html: string): string[] {
  const features = [];
  
  if (html.toLowerCase().includes('mobile app')) features.push('mobile_app');
  if (html.toLowerCase().includes('spanish')) features.push('spanish_support');
  if (html.toLowerCase().includes('grower')) features.push('grower_track');
  if (html.toLowerCase().includes('processor')) features.push('processor_track');
  if (html.toLowerCase().includes('live training')) features.push('live_training');
  if (html.toLowerCase().includes('on-demand') || html.toLowerCase().includes('on demand')) features.push('on_demand');
  if (html.toLowerCase().includes('mca approved') || html.toLowerCase().includes('mmcc approved')) features.push('mca_approved');
  if (html.toLowerCase().includes('comar')) features.push('comar_compliant');
  
  return features;
}

function extractPricing(html: string): { amount?: number, notes?: string } {
  // Look for price patterns
  const pricePattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  const matches = html.match(pricePattern);
  
  if (matches && matches.length > 0) {
    const prices = matches.map(m => parseFloat(m.replace('$', '').replace(',', '')));
    const minPrice = Math.min(...prices);
    
    return { amount: minPrice, notes: 'Detected from website' };
  }
  
  return { notes: 'No pricing found' };
}

function extractClaims(html: string): string[] {
  const claims = [];
  
  if (html.includes('2024 COMAR') || html.includes('2025 COMAR')) claims.push('Updated COMAR');
  if (html.includes('MCA approved') || html.includes('MMCC approved')) claims.push('MCA Approved');
  if (html.includes('certified instructors')) claims.push('Certified Instructors');
  if (html.includes('100% compliant')) claims.push('Full Compliance');
  
  return claims;
}

function detectChanges(previous: any, current: any): Array<{
  type: string;
  severity: string;
  description: string;
  metadata: any;
}> {
  const changes = [];
  
  // Check for new features
  const prevFeatures = previous.features_detected || [];
  const currFeatures = current.features_detected || [];
  const newFeatures = currFeatures.filter((f: string) => !prevFeatures.includes(f));
  
  if (newFeatures.length > 0) {
    changes.push({
      type: 'new_feature',
      severity: newFeatures.includes('grower_track') || newFeatures.includes('processor_track') ? 'critical' : 'medium',
      description: `${current.competitor_name} added new features: ${newFeatures.join(', ')}`,
      metadata: { new_features: newFeatures }
    });
  }
  
  // Check pricing changes
  const prevPrice = previous.pricing_info?.amount;
  const currPrice = current.pricing_detected?.amount;
  
  if (prevPrice && currPrice && currPrice < prevPrice) {
    changes.push({
      type: 'price_drop',
      severity: 'medium',
      description: `${current.competitor_name} reduced pricing from $${prevPrice} to $${currPrice}`,
      metadata: { previous_price: prevPrice, new_price: currPrice }
    });
  }
  
  return changes;
}
