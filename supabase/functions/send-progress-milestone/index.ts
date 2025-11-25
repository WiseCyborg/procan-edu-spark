import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, milestone_percentage, modules_completed, total_modules } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user details
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, email')
      .eq('user_id', user_id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const milestoneMessages: Record<number, { title: string; message: string; emoji: string }> = {
      25: {
        title: 'Quarter Way There! 🎯',
        message: `Great start, ${profile.first_name}! You've completed ${modules_completed} out of ${total_modules} modules. Keep up the momentum!`,
        emoji: '🎯'
      },
      50: {
        title: 'Halfway Champion! 🏆',
        message: `Amazing progress, ${profile.first_name}! You're halfway through the training with ${modules_completed} modules completed. You're doing great!`,
        emoji: '🏆'
      },
      75: {
        title: 'Almost There! 🚀',
        message: `Fantastic work, ${profile.first_name}! You've completed ${modules_completed} out of ${total_modules} modules. Just a few more to go until the final exam!`,
        emoji: '🚀'
      },
      100: {
        title: 'All Modules Complete! 🎉',
        message: `Congratulations, ${profile.first_name}! You've completed all ${total_modules} training modules. You're now ready to take the final exam!`,
        emoji: '🎉'
      }
    };

    const milestone = milestoneMessages[milestone_percentage];
    if (!milestone) {
      throw new Error('Invalid milestone percentage');
    }

    // Queue email notification
    await supabase.from('notification_queue').insert({
      recipient_email: profile.email,
      subject: `${milestone.emoji} ${milestone.title}`,
      message: milestone.message,
      scheduled_for: new Date().toISOString(),
      priority: 'normal',
      metadata: {
        milestone_percentage,
        modules_completed,
        total_modules,
        user_id
      }
    });

    console.log(`Progress milestone email queued for ${profile.email} (${milestone_percentage}%)`);

    return new Response(
      JSON.stringify({ success: true, message: 'Milestone notification queued' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error sending progress milestone:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
