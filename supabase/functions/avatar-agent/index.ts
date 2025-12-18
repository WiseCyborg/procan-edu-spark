import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AvatarContext {
  firstName?: string;
  role: string;
  organizationName?: string;
  organizationId?: string;
  currentPage: string;
  issueDetected?: string;
  recommendedAction?: string;
  moduleNumber?: number;
  moduleName?: string;
  completionPercentage?: number;
}

interface AvatarRequest {
  promptId?: string;
  trigger?: string;
  context: AvatarContext;
  generateAudio?: boolean;
  voice?: string;
  userId?: string;
}

// Master prompt templates (subset for edge function)
const PROMPT_TEMPLATES: Record<string, { template: string; gazeTarget?: string; priority: string }> = {
  'admin-pipeline-health-alert': {
    template: `Hi {{first_name}}. I'm noticing that {{organization_name}} has a manager who hasn't completed registration yet. This is preventing seats from being activated. You can resolve this by sending a reminder from the Actions menu. Once the manager completes registration, the pipeline will automatically update.`,
    gazeTarget: '#org-actions-menu',
    priority: 'high'
  },
  'admin-system-health-degraded': {
    template: `{{first_name}}, I've detected some system issues that need attention. {{issue_detected}} {{recommended_action}} I'll keep monitoring and let you know once things are back to normal.`,
    gazeTarget: '#health-feed',
    priority: 'high'
  },
  'manager-onboarding-welcome': {
    template: `Welcome, {{first_name}}. You're currently on the manager onboarding screen. This is where you confirm your organization details and invite employees. Once all four steps are complete, your team will be able to begin training immediately.`,
    gazeTarget: '#onboarding-steps',
    priority: 'normal'
  },
  'student-module-locked': {
    template: `Hi {{first_name}}. It looks like this module is locked because the overview hasn't been marked complete yet. That's required before moving forward. Once you mark the overview as complete, the next module will unlock automatically.`,
    gazeTarget: '#mark-complete-button',
    priority: 'high'
  },
  'student-training-welcome': {
    template: `Welcome to your training, {{first_name}}. You're starting the Responsible Vendor Training course. There are 23 modules to complete, each covering important compliance topics. Take your time with each section. Your progress saves automatically, so you can return anytime.`,
    gazeTarget: '#module-list',
    priority: 'normal'
  },
  'student-progress-milestone': {
    template: `Great work, {{first_name}}! You've completed {{completion_percentage}} percent of your training. You're making excellent progress. Keep going — you're on track to earn your certificate.`,
    priority: 'normal'
  },
  'student-exam-ready': {
    template: `Congratulations, {{first_name}}. You've completed all 23 training modules. You're now ready to take the final certification exam. You'll need to score 80 percent or higher to pass. Take your time and read each question carefully. Good luck — I know you're prepared.`,
    gazeTarget: '#start-exam-button',
    priority: 'high'
  },
  'public-certificate-verification': {
    template: `You're on the ProCann Edu certificate verification page. This tool confirms whether a certificate is valid and active. Enter the certificate number to check its status. If the certificate is valid, you'll see the holder's name and expiration date.`,
    gazeTarget: '#certificate-input',
    priority: 'normal'
  },
  'system-error-recovery': {
    template: `I noticed something didn't work as expected, {{first_name}}. Don't worry — your progress has been saved. {{recommended_action}} If the issue continues, you can contact support for help.`,
    priority: 'normal'
  }
};

// Trigger to prompt ID mapping
const TRIGGER_MAP: Record<string, Record<string, string>> = {
  '/admin': { admin: 'admin-pipeline-health-alert' },
  '/manager-onboarding': { manager: 'manager-onboarding-welcome' },
  '/course': { student: 'student-training-welcome' },
  '/course/final-exam': { student: 'student-exam-ready' },
  '/verify-certificate': { public: 'public-certificate-verification' },
  'module_locked': { student: 'student-module-locked' },
  'progress_milestone': { student: 'student-progress-milestone' },
  'system_error': { student: 'system-error-recovery', manager: 'system-error-recovery', admin: 'system-error-recovery' },
  'system_health_degraded': { admin: 'admin-system-health-degraded' }
};

function compilePrompt(template: string, context: AvatarContext): string {
  let compiled = template;
  compiled = compiled.replace(/\{\{first_name\}\}/g, context.firstName || 'there');
  compiled = compiled.replace(/\{\{role\}\}/g, context.role || 'user');
  compiled = compiled.replace(/\{\{organization_name\}\}/g, context.organizationName || 'your organization');
  compiled = compiled.replace(/\{\{current_page\}\}/g, context.currentPage || 'this page');
  compiled = compiled.replace(/\{\{issue_detected\}\}/g, context.issueDetected || '');
  compiled = compiled.replace(/\{\{recommended_action\}\}/g, context.recommendedAction || '');
  compiled = compiled.replace(/\{\{module_number\}\}/g, String(context.moduleNumber || ''));
  compiled = compiled.replace(/\{\{module_name\}\}/g, context.moduleName || 'this module');
  compiled = compiled.replace(/\{\{completion_percentage\}\}/g, String(context.completionPercentage || 0));
  return compiled.trim();
}

function findPromptId(trigger: string, role: string): string | null {
  const roleMap = TRIGGER_MAP[trigger];
  if (!roleMap) return null;
  return roleMap[role] || roleMap['public'] || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { promptId, trigger, context, generateAudio = false, voice = 'nova', userId }: AvatarRequest = await req.json();

    console.log('[Avatar Agent] Request:', { promptId, trigger, role: context.role, generateAudio });

    // Determine prompt ID from trigger if not provided
    const resolvedPromptId = promptId || (trigger ? findPromptId(trigger, context.role) : null);

    if (!resolvedPromptId) {
      return new Response(
        JSON.stringify({ error: 'No matching prompt found', trigger, role: context.role }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const promptConfig = PROMPT_TEMPLATES[resolvedPromptId];
    if (!promptConfig) {
      return new Response(
        JSON.stringify({ error: 'Prompt not found', promptId: resolvedPromptId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compile the prompt with context
    const compiledText = compilePrompt(promptConfig.template, context);

    let audioBase64: string | null = null;

    // Generate audio if requested
    if (generateAudio) {
      const openAIKey = Deno.env.get('OPENAI_API_KEY');
      
      if (openAIKey) {
        try {
          const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'tts-1',
              voice: voice,
              input: compiledText.substring(0, 4096),
              speed: 1.0
            })
          });

          if (ttsResponse.ok) {
            const audioBuffer = await ttsResponse.arrayBuffer();
            // Use proper base64 encoding for Deno
            audioBase64 = btoa(
              Array.from(new Uint8Array(audioBuffer))
                .map(b => String.fromCharCode(b))
                .join('')
            );
            console.log('[Avatar Agent] Generated audio, size:', audioBuffer.byteLength);
          } else {
            console.error('[Avatar Agent] TTS error:', ttsResponse.status);
          }
        } catch (ttsError) {
          console.error('[Avatar Agent] TTS failed:', ttsError);
        }
      }
    }

    // Log the interaction
    if (userId) {
      await supabase.from('avatar_interactions').insert({
        user_id: userId,
        prompt_id: resolvedPromptId,
        context: context,
        action: 'triggered',
        created_at: new Date().toISOString()
      }).catch(err => console.error('[Avatar Agent] Failed to log interaction:', err));
    }

    // Emit agent event for tracking
    await supabase.from('agent_events').insert({
      event_type: 'avatar_dispatch',
      source_agent: 'avatar-agent',
      payload: {
        promptId: resolvedPromptId,
        context,
        hasAudio: !!audioBase64,
        compiledTextLength: compiledText.length
      },
      status: 'completed'
    }).catch(err => console.error('[Avatar Agent] Failed to log event:', err));

    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        promptId: resolvedPromptId,
        compiledText,
        audioBase64,
        gazeTarget: promptConfig.gazeTarget,
        priority: promptConfig.priority,
        executionTimeMs: executionTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Avatar Agent] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
