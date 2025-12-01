// Phase 2: Auto-Create Organization Channels Edge Function
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, createdBy } = await req.json();

    if (!organizationId || !createdBy) {
      return new Response(
        JSON.stringify({ error: 'organizationId and createdBy are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating default channels for organization: ${organizationId}`);

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

    const createdChannels = [];

    // Create each default channel
    for (const channelConfig of DEFAULT_CHANNELS) {
      // Create conversation
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

      // Add all employees as participants (except restricted channels)
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
        // For restricted channels, only add managers/coordinators
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
        message: `Created ${createdChannels.length} default channels`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-org-channels:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
