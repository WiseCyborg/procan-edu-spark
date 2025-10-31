import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { organization_id } = await req.json();

    console.log('🧹 Cleaning up test organization:', organization_id);

    // Get all users in this organization
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('organization_id', organization_id);

    // Delete user data
    if (profiles && profiles.length > 0) {
      const userIds = profiles.map(p => p.user_id);
      
      // Delete user roles
      await supabaseClient.from('user_roles').delete().in('user_id', userIds);
      
      // Delete user progress
      await supabaseClient.from('user_progress').delete().in('user_id', userIds);
      
      // Delete certificates
      await supabaseClient.from('certificates').delete().in('user_id', userIds);
      
      // Delete profiles
      await supabaseClient.from('profiles').delete().in('user_id', userIds);
      
      // Delete auth users
      for (const userId of userIds) {
        await supabaseClient.auth.admin.deleteUser(userId);
      }
    }

    // Delete organization data
    await supabaseClient.from('rvt_seats').delete().eq('organization_id', organization_id);
    await supabaseClient.from('rvt_join_codes').delete().eq('organization_id', organization_id);
    await supabaseClient.from('rvt_purchases').delete().eq('organization_id', organization_id);
    await supabaseClient.from('dispensary_applications').delete().eq('organization_id', organization_id);
    await supabaseClient.from('organizations').delete().eq('id', organization_id);

    console.log('✅ Cleanup complete');

    return new Response(
      JSON.stringify({ success: true, message: 'Test data cleaned up successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
