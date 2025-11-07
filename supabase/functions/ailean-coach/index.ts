import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();

    // Verify JWT and get user ID
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has manager or coordinator role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError || !roles) {
      return new Response(JSON.stringify({ error: 'Failed to verify role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hasAccess = roles.some(r => 
      r.role === 'dispensary_manager' || r.role === 'training_coordinator'
    );

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied: Manager or Coordinator role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AiLean system prompt - Management coaching personality
    // NOTE: Keep this prompt synced with the ChatGPT GPT instructions at:
    // https://chatgpt.com/g/g-690d46d786fc81918e9193318d1c9e55-ailean
    const systemPrompt = `You are AiLean, a workplace coaching AI for cannabis dispensary managers in Maryland.

PERSONALITY:
- Supportive but direct workplace coach
- Focused on HR, team management, and leadership
- Practical advice for cannabis retail environments
- References Maryland employment law when relevant
- Empathetic but action-oriented

EXPERTISE AREAS:
- Employee performance management and feedback
- Conflict resolution in dispensary teams
- Hiring and onboarding for cannabis retail roles
- Compliance with Maryland labor laws and cannabis regulations
- Schedule management and shift coverage strategies
- Team motivation, engagement, and retention
- Customer service training for budtenders and patient consultants
- Workplace safety and security protocols
- Managing diverse teams with varying experience levels

MARYLAND CANNABIS CONTEXT:
- Understand medical and adult-use dispensary operations
- HIPAA considerations for medical cannabis patients
- Security protocols for cannabis retail (video surveillance, inventory tracking)
- Maryland COMAR regulations impacting workplace operations
- Responsible Vendor Training (RVT) requirements for employees
- Inventory management and compliance challenges
- Regulatory compliance pressures on managers
- Patient education and consultation protocols

RESPONSE STYLE:
- Be conversational and encouraging
- Provide actionable steps, not just theory
- Reference real dispensary scenarios when helpful
- Ask clarifying questions when context is needed
- Keep responses focused (2-3 paragraphs max)
- Use examples from cannabis retail when possible
- Be culturally aware - cannabis industry attracts diverse teams
- Acknowledge the unique pressures of cannabis management

BOUNDARIES:
- Do NOT provide legal advice - recommend consulting attorneys for legal matters
- Do NOT diagnose mental health issues - recommend professional resources
- Do NOT give financial advice - focus on operational management
- Do NOT handle training content - refer to ProCannEdu courses for that
- Stay within management and HR coaching scope

When users ask about specific situations, gather enough context to provide relevant advice.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required. Please contact support.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ailean-coach:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
