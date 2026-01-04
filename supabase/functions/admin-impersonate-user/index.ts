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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[admin-impersonate-user] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !callerUser) {
      console.error('[admin-impersonate-user] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller has admin role
    const { data: adminRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('role', 'admin');

    if (roleError || !adminRoles || adminRoles.length === 0) {
      console.error('[admin-impersonate-user] Not an admin:', callerUser.email);
      return new Response(
        JSON.stringify({ error: 'Only admins can impersonate users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Target user ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user details
    const { data: targetAuth, error: targetError } = await supabase.auth.admin.getUserById(targetUserId);
    
    if (targetError || !targetAuth.user) {
      console.error('[admin-impersonate-user] Target user not found:', targetUserId);
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deactivate any existing proxy sessions for this admin
    await supabase
      .from('admin_proxy_sessions')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('admin_user_id', callerUser.id)
      .eq('is_active', true);

    // Create server-side proxy session record
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const { data: proxySession, error: sessionError } = await supabase
      .from('admin_proxy_sessions')
      .insert({
        admin_user_id: callerUser.id,
        target_user_id: targetUserId,
        expires_at: expiresAt.toISOString(),
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent') || null,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('[admin-impersonate-user] Failed to create session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create proxy session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a magic link for impersonation (valid for 1 hour)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: targetAuth.user.email!,
      options: {
        redirectTo: `${req.headers.get('origin') || supabaseUrl}/dashboard`,
      }
    });

    if (linkError || !linkData) {
      console.error('[admin-impersonate-user] Failed to generate link:', linkError);
      // Rollback session creation
      await supabase
        .from('admin_proxy_sessions')
        .delete()
        .eq('id', proxySession.id);
      return new Response(
        JSON.stringify({ error: 'Failed to generate impersonation session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the impersonation for audit
    await supabase.from('admin_operations_audit').insert({
      performed_by: callerUser.id,
      operation_type: 'proxy_session_start',
      target_user_id: targetUserId,
      target_email: targetAuth.user.email,
      ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || null,
      metadata: { 
        session_id: proxySession.id,
        expires_at: expiresAt.toISOString(),
        user_agent: req.headers.get('user-agent'),
      },
      success: true,
    });

    console.log(`[admin-impersonate-user] Admin ${callerUser.email} impersonating ${targetAuth.user.email}, session: ${proxySession.id}`);

    // Return the hashed token and session ID
    return new Response(
      JSON.stringify({
        success: true,
        session_id: proxySession.id,
        token_hash: linkData.properties?.hashed_token,
        verification_type: linkData.properties?.verification_type,
        redirect_url: linkData.properties?.redirect_to,
        target_email: targetAuth.user.email,
        target_name: `${targetAuth.user.user_metadata?.first_name || ''} ${targetAuth.user.user_metadata?.last_name || ''}`.trim(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-impersonate-user] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
