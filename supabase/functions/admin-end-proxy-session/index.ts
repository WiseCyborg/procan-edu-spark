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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Revoke the proxy session
    const { data: session, error: updateError } = await supabase
      .from('admin_proxy_sessions')
      .update({ 
        is_active: false, 
        revoked_at: new Date().toISOString() 
      })
      .eq('id', sessionId)
      .select('admin_user_id, target_user_id')
      .single();

    if (updateError) {
      console.error('[admin-end-proxy-session] Error revoking session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to end proxy session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the session end for audit
    if (session) {
      await supabase.from('admin_operations_audit').insert({
        performed_by: session.admin_user_id,
        operation_type: 'proxy_session_end',
        target_user_id: session.target_user_id,
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || null,
        metadata: { 
          session_id: sessionId,
          user_agent: req.headers.get('user-agent'),
        },
        success: true,
      });
    }

    console.log(`[admin-end-proxy-session] Session ${sessionId} revoked`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-end-proxy-session] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
