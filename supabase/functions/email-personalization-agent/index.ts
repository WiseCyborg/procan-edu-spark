import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PersonalizationRequest {
  templateId: string;
  recipientEmail: string;
  userId?: string;
  orgId?: string;
  intent: 'invite' | 'reminder' | 'approved' | 'payment' | 'certificate' | 'welcome' | 'notification';
  customData?: Record<string, string>;
}

interface PersonalizedEmail {
  subject: string;
  preheader?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  personalizationApplied: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: PersonalizationRequest = await req.json();
    console.log('[PersonalizationAgent] Processing request:', request);

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', request.templateId)
      .single();

    if (templateError || !template) {
      // Try by template_name
      const { data: templateByName } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_name', request.templateId)
        .single();
      
      if (!templateByName) {
        throw new Error(`Template not found: ${request.templateId}`);
      }
      Object.assign(template || {}, templateByName);
    }

    // Fetch user context if userId provided
    let userContext: Record<string, string> = {};
    if (request.userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email_cache')
        .eq('user_id', request.userId)
        .single();

      if (profile) {
        userContext.first_name = profile.first_name || '';
        userContext.last_name = profile.last_name || '';
        userContext.email = profile.email_cache || request.recipientEmail;
      }
    }

    // Fetch organization context if orgId provided
    let orgContext: Record<string, string> = {};
    if (request.orgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, unique_access_key, contact_email')
        .eq('id', request.orgId)
        .single();

      if (org) {
        orgContext.organization_name = org.name || '';
        orgContext.access_key = org.unique_access_key || '';
        orgContext.org_email = org.contact_email || '';
      }

      // Get join code
      const { data: joinCode } = await supabase
        .from('rvt_join_codes')
        .select('code')
        .eq('organization_id', request.orgId)
        .eq('is_active', true)
        .single();

      if (joinCode) {
        orgContext.join_code = joinCode.code;
      }
    }

    // Merge all context
    const context = {
      ...userContext,
      ...orgContext,
      ...request.customData,
      recipient_email: request.recipientEmail,
      current_date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      }),
      current_year: new Date().getFullYear().toString(),
    };

    // Parse template contract
    const contract = template.contract_json || {
      required_variables: [],
      allowed_ai_fields: ['subject', 'preheader'],
      tone: template.allowed_tone || 'professional',
      locked_footer: true,
    };

    // Replace template variables
    let htmlContent = template.html_content || '';
    let subject = template.subject_line || '';
    const personalizationApplied: string[] = [];

    // Simple variable replacement {{variable_name}}
    const variableRegex = /\{\{(\w+)\}\}/g;
    
    htmlContent = htmlContent.replace(variableRegex, (match, varName) => {
      if (context[varName]) {
        personalizationApplied.push(varName);
        return context[varName];
      }
      return match;
    });

    subject = subject.replace(variableRegex, (match, varName) => {
      if (context[varName]) {
        return context[varName];
      }
      return match;
    });

    // AI personalization if enabled and API key available
    if (template.ai_personalization_enabled && lovableApiKey && context.first_name) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are an email personalization assistant for ProCann Edu, a cannabis compliance training platform.
                
RULES (STRICTLY FOLLOW):
1. ALWAYS address the recipient by their first name: ${context.first_name}
2. Keep tone: ${contract.tone}
3. NEVER make up compliance claims or policy statements
4. NEVER modify legal disclaimers or compliance language
5. Keep personalization subtle and professional
6. Maximum 1-2 personalized sentences

Intent: ${request.intent}
Organization: ${context.organization_name || 'N/A'}
`,
              },
              {
                role: "user",
                content: `Generate a brief personalized opening line for this email. Just the opening line, nothing else.`,
              },
            ],
            max_tokens: 100,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const personalizedOpening = aiData.choices?.[0]?.message?.content;
          
          if (personalizedOpening && personalizedOpening.includes(context.first_name)) {
            // Insert personalized opening after the first greeting
            htmlContent = htmlContent.replace(
              /<p>/i, 
              `<p>${personalizedOpening}</p><p>`
            );
            personalizationApplied.push('ai_opening');
          }
        }
      } catch (aiError) {
        console.error('[PersonalizationAgent] AI error (non-critical):', aiError);
      }
    }

    // Ensure first name is always used
    if (context.first_name && !htmlContent.includes(context.first_name)) {
      htmlContent = htmlContent.replace(
        /(<body[^>]*>)/i,
        `$1<p>Hi ${context.first_name},</p>`
      );
      personalizationApplied.push('first_name_greeting');
    }

    const result: PersonalizedEmail = {
      subject,
      bodyHtml: htmlContent,
      personalizationApplied,
    };

    console.log('[PersonalizationAgent] Personalization complete:', personalizationApplied);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('[PersonalizationAgent] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
