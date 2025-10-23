import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DemoAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'dispensary_manager' | 'training_coordinator' | 'student';
  organizationName?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (!roles?.some(r => r.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create demo organization first
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, unique_access_key')
      .eq('name', 'Demo Dispensary LLC')
      .maybeSingle();

    let orgId: string;
    let accessKey: string;

    if (existingOrg) {
      orgId = existingOrg.id;
      accessKey = existingOrg.unique_access_key;
      console.log('Using existing demo organization');
    } else {
      accessKey = 'DEMO-2025-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Demo Dispensary LLC',
          contact_person: 'Demo Manager',
          contact_email: 'manager@demo-dispensary.com',
          contact_phone: '410-555-DEMO',
          address: '123 Demo Street, Baltimore, MD 21201',
          license_number: 'MCA-DEMO-12345',
          unique_access_key: accessKey,
          course_credits: 50,
          admin_approved: true,
          payment_status: 'paid'
        })
        .select('id')
        .single();

      if (orgError) throw orgError;
      orgId = newOrg.id;
      console.log('Created new demo organization:', orgId);
    }

    // Define demo accounts
    const demoAccounts: DemoAccount[] = [
      {
        email: 'admin@procannedu.com',
        password: 'Admin123!Demo',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin'
      },
      {
        email: 'manager@demo-dispensary.com',
        password: 'Manager123!Demo',
        firstName: 'Demo',
        lastName: 'Manager',
        role: 'dispensary_manager',
        organizationName: 'Demo Dispensary LLC'
      },
      {
        email: 'coordinator@demo-dispensary.com',
        password: 'Coord123!Demo',
        firstName: 'Training',
        lastName: 'Coordinator',
        role: 'training_coordinator',
        organizationName: 'Demo Dispensary LLC'
      },
      {
        email: 'employee@demo-dispensary.com',
        password: 'Student123!Demo',
        firstName: 'Demo',
        lastName: 'Employee',
        role: 'student',
        organizationName: 'Demo Dispensary LLC'
      }
    ];

    const createdAccounts = [];

    for (const account of demoAccounts) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const userExists = existingUsers.users.some(u => u.email === account.email);

        let userId: string;

        if (userExists) {
          const existingUser = existingUsers.users.find(u => u.email === account.email);
          userId = existingUser!.id;
          console.log(`User ${account.email} already exists, skipping creation`);
        } else {
          // Create user via Supabase Auth
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true,
            user_metadata: {
              first_name: account.firstName,
              last_name: account.lastName
            }
          });

          if (createError) {
            console.error(`Error creating ${account.email}:`, createError);
            continue;
          }

          userId = newUser.user.id;
          console.log(`Created user: ${account.email}`);
        }

        // Ensure profile exists (trigger should create it, but verify)
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', userId)
          .single();

        if (!profile) {
          // Manually create profile if trigger failed
          await supabase.from('profiles').insert({
            user_id: userId,
            first_name: account.firstName,
            last_name: account.lastName,
            organization_id: account.organizationName ? orgId : null
          });
        } else if (account.organizationName) {
          // Update organization if needed
          await supabase
            .from('profiles')
            .update({ organization_id: orgId })
            .eq('user_id', userId);
        }

        // Ensure role exists
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', account.role)
          .single();

        if (!existingRole) {
          await supabase.from('user_roles').insert({
            user_id: userId,
            role: account.role
          });
        }

        createdAccounts.push({
          email: account.email,
          password: account.password,
          role: account.role,
          name: `${account.firstName} ${account.lastName}`,
          organizationName: account.organizationName || 'N/A'
        });

      } catch (error) {
        console.error(`Error processing ${account.email}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo accounts created successfully',
        accounts: createdAccounts,
        organization: {
          id: orgId,
          name: 'Demo Dispensary LLC',
          accessKey: accessKey
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in create-demo-accounts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
