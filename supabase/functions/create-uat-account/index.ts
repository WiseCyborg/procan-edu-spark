import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEED_PASSWORD = 'UATtest123!';
const SEED_ACCOUNTS = [
  { email: 'uat+student@test.com',  account_type: 'student',  role: 'student',  first: 'UAT', last: 'Student' },
  { email: 'uat+manager@test.com',  account_type: 'manager',  role: 'manager',  first: 'UAT', last: 'Manager' },
  { email: 'uat+employee@test.com', account_type: 'employee', role: 'student',  first: 'UAT', last: 'Employee' },
  { email: 'uat+admin@test.com',    account_type: 'admin',    role: 'admin',    first: 'UAT', last: 'Admin' },
];

async function seedAll(supabase: any) {
  const results: any[] = [];
  for (const acc of SEED_ACCOUNTS) {
    try {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === acc.email);
      let userId: string;
      if (existing) {
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, {
          password: SEED_PASSWORD,
          email_confirm: true,
          user_metadata: { first_name: acc.first, last_name: acc.last, is_uat_account: true },
        });
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: acc.email,
          password: SEED_PASSWORD,
          email_confirm: true,
          user_metadata: { first_name: acc.first, last_name: acc.last, is_uat_account: true },
        });
        if (error || !data.user) throw new Error(`create: ${error?.message}`);
        userId = data.user.id;
      }

      await supabase.from('profiles').upsert(
        { user_id: userId, first_name: acc.first, last_name: acc.last, email_cache: acc.email },
        { onConflict: 'user_id' }
      );
      await supabase.from('user_roles').upsert(
        { user_id: userId, role: acc.role },
        { onConflict: 'user_id,role' }
      );
      await supabase.from('user_journey_state').upsert(
        { user_id: userId, current_stage: 'new_user', modules_completed: 0 },
        { onConflict: 'user_id' }
      );
      await supabase.from('uat_accounts').upsert(
        {
          user_id: userId,
          account_type: acc.account_type,
          email: acc.email,
          password_hint: SEED_PASSWORD,
          notes: 'Louis/Danielle UAT credentials',
          is_active: true,
        },
        { onConflict: 'email' }
      );
      results.push({ email: acc.email, userId, ok: true });
    } catch (e: any) {
      results.push({ email: acc.email, ok: false, error: e.message });
    }
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));

    // Bulk-seed mode for Louis/Danielle UAT credentials (no auth required)
    if (body?.seedAll === true) {
      const results = await seedAll(supabase);
      return new Response(
        JSON.stringify({ success: true, password: SEED_PASSWORD, results }, null, 2),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single-account creation requires admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: roles } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some((r: any) => r.role === 'admin')) throw new Error('Admin access required');

    const { accountType, email, password, firstName, lastName, organizationId, notes } = body;
    if (!accountType || !email || !password) {
      throw new Error('accountType, email, and password are required');
    }

    const { data: authData, error: authCreateError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: {
        first_name: firstName || 'UAT',
        last_name: lastName || accountType.charAt(0).toUpperCase() + accountType.slice(1),
        is_uat_account: true,
      },
    });
    if (authCreateError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authCreateError?.message}`);
    }
    const newUserId = authData.user.id;

    await supabase.from('profiles').insert({
      user_id: newUserId,
      first_name: firstName || 'UAT',
      last_name: lastName || accountType.charAt(0).toUpperCase() + accountType.slice(1),
      email_cache: email,
      organization_id: organizationId || null,
      phone: '555-UAT-TEST',
    });

    await supabase.from('user_roles').insert({
      user_id: newUserId,
      role: accountType === 'employee' ? 'student' : accountType,
    });

    await supabase.from('user_journey_state').insert({
      user_id: newUserId, current_stage: 'new_user', modules_completed: 0,
    });

    await supabase.from('uat_accounts').insert({
      user_id: newUserId,
      account_type: accountType,
      email,
      password_hint: password,
      organization_id: organizationId,
      created_by: user.id,
      notes: notes || `UAT ${accountType} account`,
      is_active: true,
    });

    return new Response(
      JSON.stringify({ success: true, userId: newUserId, email, accountType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[create-uat-account] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
