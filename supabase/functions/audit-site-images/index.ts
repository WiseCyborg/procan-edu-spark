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

    console.log('Starting image audit...');

    // Fetch all active image assets
    const { data: images, error } = await supabase
      .from('image_assets')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    console.log(`Checking ${images?.length || 0} images`);

    const brokenImages: string[] = [];
    const missingAltText: string[] = [];
    const healthyImages: string[] = [];

    for (const image of images || []) {
      try {
        // Test if image URL is accessible
        const response = await fetch(image.public_url, { method: 'HEAD' });
        
        if (!response.ok) {
          brokenImages.push(image.asset_key);
          console.log(`Broken image: ${image.asset_key} (${response.status})`);
        } else {
          healthyImages.push(image.asset_key);
        }

        // Check alt text
        if (!image.alt_text || image.alt_text.trim() === '') {
          missingAltText.push(image.asset_key);
        }
      } catch (testError) {
        brokenImages.push(image.asset_key);
        console.error(`Failed to test ${image.asset_key}:`, testError);
      }
    }

    const report = {
      total_images: images?.length || 0,
      healthy_images: healthyImages.length,
      broken_images: brokenImages.length,
      missing_alt_text: missingAltText.length,
      broken_list: brokenImages,
      missing_alt_list: missingAltText
    };

    console.log('Audit complete:', report);

    // If more than 5 images are broken, send alert
    if (brokenImages.length > 5) {
      console.log('ALERT: More than 5 broken images detected!');
      // Could trigger email notification here
    }

    return new Response(
      JSON.stringify(report),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in audit-site-images:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
