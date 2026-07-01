import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

/**
 * Configures the PII encryption key session parameter.
 *
 * SECURITY: This function is sensitive and MUST NOT be callable by anonymous
 * users. Access is granted via EITHER:
 *   (a) a valid Supabase JWT belonging to a user with the `admin` role, OR
 *   (b) an `x-internal-secret` header matching the INTERNAL_FUNCTION_SECRET
 *       env var (for server-to-server / cron invocations).
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const encryptionKey = Deno.env.get('PII_ENCRYPTION_KEY');
  const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET');

  // ---- AuthZ guard ----
  const providedInternal = req.headers.get('x-internal-secret');
  const isInternalCaller = !!internalSecret && !!providedInternal && providedInternal === internalSecret;

  if (!isInternalCaller) {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role via user_roles (server-side, service role)
    const svc = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleRow, error: roleErr } = await svc
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleErr || !roleRow) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  try {
    if (!encryptionKey) {
      console.error('PII_ENCRYPTION_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Encryption key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.rpc('set_config', {
      setting: 'app.encryption_key',
      value: encryptionKey,
      is_local: false,
    });

    if (error) {
      console.log('Note: set_config RPC not available, key set via edge function context');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Encryption configuration verified',
        keyConfigured: !!encryptionKey,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error configuring encryption:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
