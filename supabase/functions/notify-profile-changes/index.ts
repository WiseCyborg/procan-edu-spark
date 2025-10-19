import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  userId: string;
  changedFields: string[];
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, changedFields, oldValues, newValues }: NotifyRequest = await req.json();

    console.log('Processing profile change notification:', { userId, changedFields });

    // Create Supabase client with service role (can access all data)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user details
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, organization_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('User profile not found:', profileError);
      throw new Error('User profile not found');
    }

    const userName = `${userProfile.first_name} ${userProfile.last_name}`;

    // Get all admins via user_roles and profiles (with email_cache)
    const { data: admins, error: adminsError } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(email_cache, first_name)')
      .eq('role', 'admin');

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
      throw new Error('Failed to fetch admin users');
    }

    console.log(`Found ${admins?.length || 0} admin(s) to notify`);

    let notificationCount = 0;

    // For each changed field, create a notification
    for (const field of changedFields) {
      const oldValue = oldValues[field] || '(empty)';
      const newValue = newValues[field] || '(empty)';
      const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Create notification for each admin
      for (const admin of admins || []) {
        const adminEmail = admin.profiles.email_cache;
        
        if (adminEmail) {
          const { error: insertError } = await supabase
            .from('notification_queue')
            .insert({
              user_id: admin.user_id,
              recipient_email: adminEmail,
              subject: '🔔 Critical Profile Change Alert',
              message: `
                <h2>Profile Change Notification</h2>
                <p><strong>User:</strong> ${userName}</p>
                <p><strong>Field Changed:</strong> ${fieldLabel}</p>
                <p><strong>Previous Value:</strong> ${oldValue}</p>
                <p><strong>New Value:</strong> ${newValue}</p>
                <p><strong>Changed At:</strong> ${new Date().toLocaleString()}</p>
                <hr>
                <p><em>This is an automated notification for critical profile field changes.</em></p>
              `,
              scheduled_for: new Date().toISOString(),
              priority: 'high',
              metadata: {
                type: 'critical_profile_change',
                userId,
                field,
                oldValue,
                newValue
              }
            });

          if (insertError) {
            console.error('Failed to insert notification:', insertError);
          } else {
            notificationCount++;
          }
        }
      }
    }

    console.log(`Successfully created ${notificationCount} notification(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notificationCount,
        fieldsChanged: changedFields.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-profile-changes:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
