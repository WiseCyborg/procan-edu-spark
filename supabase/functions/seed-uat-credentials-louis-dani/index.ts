// One-shot: provision the 4 UAT accounts used by Louis & Danielle's testing guides.
// Idempotent — re-running resets password, confirms email, and ensures role.
// DELETE THIS FUNCTION AFTER USE.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PASSWORD = 'UATtest123!';

const ACCOUNTS = [
  { email: 'uat+student@test.com',  account_type: 'student',  role: 'student',  first: 'UAT', last: 'Student' },
  { email: 'uat+manager@test.com',  account_type: 'manager',  role: 'manager',  first: 'UAT', last: 'Manager' },
  { email: 'uat+employee@test.com', account_type: 'employee', role: 'student',  first: 'UAT', last: 'Employee' },
  { email: 'uat+admin@test.com',    account_type: 'admin',    role: 'admin',    first: 'UAT', last: 'Admin' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const results: any[] = [];

  for (const acc of ACCOUNTS) {
    try {
      // Find existing user
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find(u => u.email?.toLowerCase() === acc.email);

      let userId: string;
      if (existing) {
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, {
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { first_name: acc.first, last_name: acc.last, is_uat_account: true },
        });
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: acc.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { first_name: acc.first, last_name: acc.last, is_uat_account: true },
        });
        if (error || !data.user) throw new Error(`create: ${error?.message}`);
        userId = data.user.id;
      }

      // Profile
      await supabase.from('profiles').upsert(
        { user_id: userId, first_name: acc.first, last_name: acc.last, email_cache: acc.email },
        { onConflict: 'user_id' }
      );

      // Role (avoid duplicates)
      await supabase.from('user_roles').upsert(
        { user_id: userId, role: acc.role },
        { onConflict: 'user_id,role' }
      );

      // Journey
      await supabase.from('user_journey_state').upsert(
        { user_id: userId, current_stage: 'new_user', modules_completed: 0 },
        { onConflict: 'user_id' }
      );

      // UAT tracking
      await supabase.from('uat_accounts').upsert(
        {
          user_id: userId,
          account_type: acc.account_type,
          email: acc.email,
          password_hint: PASSWORD,
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

  return new Response(JSON.stringify({ password: PASSWORD, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
