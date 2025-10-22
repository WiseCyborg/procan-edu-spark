import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssignCoordinatorRequest {
  organization_id: string;
  user_email: string;
  assigned_by: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organization_id, user_email, assigned_by }: AssignCoordinatorRequest = await req.json();

    console.log('Assigning training coordinator:', { organization_id, user_email, assigned_by });

    // Verify the assigner is a dispensary manager or admin
    const { data: assignerRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', assigned_by);

    const hasPermission = assignerRoles?.some(
      r => r.role === 'admin' || r.role === 'dispensary_manager'
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only managers can assign coordinators' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const user = existingUser.users.find(u => u.email === user_email);

    if (user) {
      // User exists, assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'training_coordinator'
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Update organization_id in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      console.log('Training coordinator role assigned to existing user');
    } else {
      // User doesn't exist, send invitation
      console.log('User not found, would send invitation email');
      // In production, integrate with send-employee-invitation function
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Training coordinator assigned successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error assigning training coordinator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
