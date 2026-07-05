// Phase 2: Auto-Create Organization Channels Edge Function
// Requires authenticated caller with admin or dispensary_manager role.
// Idempotent: skips channels that already exist for the org.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChannelConfig {
  title: string;
  conversation_type: 'group' | 'announcement' | 'orientation' | 'uat' | 'study_help';
  channel_category: 'general' | 'study' | 'training' | 'uat' | 'orientation';
  metadata: {
    description: string;
    icon: string;
    restrictedRoles?: string[];
  };
}

const DEFAULT_CHANNELS: ChannelConfig[] = [
  {
    title: 'general',
    conversation_type: 'group',
    channel_category: 'general',
    metadata: {
      description: 'Team announcements and general discussion',
      icon: '💬',
    },
  },
  {
    title: 'study-help',
    conversation_type: 'study_help',
    channel_category: 'study',
    metadata: {
      description: 'Ask training questions and get help from peers',
      icon: '📚',
    },
  },
  {
    title: 'orientation',
    conversation_type: 'orientation',
    channel_category: 'orientation',
    metadata: {
      description: 'New employee onboarding and orientation',
      icon: '🎯',
    },
  },
  {
    title: 'uat-feedback',
    conversation_type: 'uat',
    channel_category: 'uat',
    metadata: {
      description: 'UAT testing feedback and bug reports (Managers only)',
      icon: '🔧',
      restrictedRoles: ['dispensary_manager', 'training_coordinator', 'admin'],
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // --- Auth: validate JWT and role ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing bearer token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authedClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const callerId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Role check
    const { data: roleRows, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .in('role', ['admin', 'dispensary_manager']);
    if (roleError) throw roleError;
    if (!roleRows || roleRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin or dispensary_manager role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId, createdBy } = await req.json();

    if (!organizationId || !createdBy) {
      return new Response(
        JSON.stringify({ error: 'organizationId and createdBy are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating default channels for organization: ${organizationId} (caller: ${callerId})`);

    // Get all employees in the organization
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('organization_id', organizationId);

    if (employeesError) {
      throw employeesError;
    }

    const employeeIds = employees?.map(e => e.user_id) || [];
    console.log(`Found ${employeeIds.length} employees in organization`);

    // Pre-fetch existing channel titles for this org (idempotency guard)
    const { data: existingChannels, error: existingError } = await supabase
      .from('conversations')
      .select('title')
      .eq('organization_id', organizationId)
      .in('title', DEFAULT_CHANNELS.map(c => c.title));
    if (existingError) throw existingError;
    const existingTitles = new Set((existingChannels || []).map(c => c.title));

    const createdChannels: Array<{ id: string; title: string; type: string; category: string }> = [];
    const skippedChannels: string[] = [];

    for (const channelConfig of DEFAULT_CHANNELS) {
      if (existingTitles.has(channelConfig.title)) {
        console.log(`Skipping existing channel: ${channelConfig.title}`);
        skippedChannels.push(channelConfig.title);
        continue;
      }

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: channelConfig.title,
          conversation_type: channelConfig.conversation_type,
          channel_category: channelConfig.channel_category,
          organization_id: organizationId,
          created_by: createdBy,
          metadata: channelConfig.metadata,
          is_active: true,
        })
        .select()
        .single();

      if (convError) {
        console.error(`Error creating channel ${channelConfig.title}:`, convError);
        continue;
      }

      console.log(`Created channel: ${channelConfig.title} (${conversation.id})`);

      if (!channelConfig.metadata.restrictedRoles) {
        const participants = employeeIds.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId,
          role: 'member',
        }));

        if (participants.length > 0) {
          const { error: participantsError } = await supabase
            .from('conversation_participants')
            .insert(participants);

          if (participantsError) {
            console.error(`Error adding participants to ${channelConfig.title}:`, participantsError);
          } else {
            console.log(`Added ${participants.length} participants to ${channelConfig.title}`);
          }
        }
      } else {
        const { data: managers, error: managersError } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', channelConfig.metadata.restrictedRoles)
          .in('user_id', employeeIds);

        if (!managersError && managers && managers.length > 0) {
          const managerParticipants = managers.map(m => ({
            conversation_id: conversation.id,
            user_id: m.user_id,
            role: 'admin',
          }));

          await supabase
            .from('conversation_participants')
            .insert(managerParticipants);

          console.log(`Added ${managerParticipants.length} managers to ${channelConfig.title}`);
        }
      }

      createdChannels.push({
        id: conversation.id,
        title: channelConfig.title,
        type: channelConfig.conversation_type,
        category: channelConfig.channel_category,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        channels: createdChannels,
        skipped: skippedChannels,
        message: `Created ${createdChannels.length} channel(s); skipped ${skippedChannels.length} existing.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-org-channels:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
