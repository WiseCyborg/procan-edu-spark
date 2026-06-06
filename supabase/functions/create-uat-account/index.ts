import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin access
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role === 'admin')) {
      throw new Error('Admin access required');
    }

    const {
      accountType,
      email,
      password,
      firstName,
      lastName,
      organizationId,
      notes
    } = await req.json();

    if (!accountType || !email || !password) {
      throw new Error('accountType, email, and password are required');
    }

    console.log(`[UAT Create] Creating ${accountType} account: ${email}`);

    const { data: authData, error: authCreateError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || 'UAT',
        last_name: lastName || accountType.charAt(0).toUpperCase() + accountType.slice(1),
        is_uat_account: true
      }
    });

    if (authCreateError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authCreateError?.message}`);
    }

    const newUserId = authData.user.id;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: newUserId,
        first_name: firstName || 'UAT',
        last_name: lastName || accountType.charAt(0).toUpperCase() + accountType.slice(1),
        email_cache: email,
        organization_id: organizationId || null,
        phone: '555-UAT-TEST'
      });
    if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: accountType === 'employee' ? 'student' : accountType
      });
    if (roleError) throw new Error(`Failed to assign role: ${roleError.message}`);

    if (accountType === 'employee' && organizationId) {
      const { data: availableSeat } = await supabase
        .from('rvt_seats')
        .select('id, course_id')
        .eq('organization_id', organizationId)
        .eq('status', 'available')
        .limit(1)
        .single();

      if (availableSeat) {
        await supabase
          .from('rvt_seats')
          .update({
            status: 'assigned',
            assigned_user_id: newUserId,
            assigned_at: new Date().toISOString()
          })
          .eq('id', availableSeat.id);

        if (availableSeat.course_id) {
          await supabase
            .from('course_entitlements')
            .upsert({
              user_id: newUserId,
              course_id: availableSeat.course_id,
              source: 'org_seat',
              status: 'active',
              purchased_at: new Date().toISOString(),
              metadata: { seat_id: availableSeat.id, organization_id: organizationId }
            }, { onConflict: 'user_id,course_id' });
        }
      }
    }

    await supabase
      .from('user_journey_state')
      .insert({
        user_id: newUserId,
        current_stage: 'new_user'
      });

    await supabase
      .from('uat_accounts')
      .insert({
        user_id: newUserId,
        account_type: accountType,
        email,
        password_hint: password,
        organization_id: organizationId,
        created_by: user.id,
        notes: notes || `UAT ${accountType} account`,
        is_active: true
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'UAT account created successfully',
        userId: newUserId,
        email,
        accountType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[UAT Create] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
