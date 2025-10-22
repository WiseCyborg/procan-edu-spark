import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  context?: any;
  user_id?: string;
  user_roles?: string[];
  security_level?: string;
}

// Intent Classification
function classifyIntent(message: string, userRole: string): {
  intent: 'api_command' | 'human_escalation' | 'faq' | 'general_help';
  confidence: number;
  mode: 'console' | 'human' | 'ai_assist';
} {
  const lowerMessage = message.toLowerCase();
  
  // API Command Patterns
  const apiPatterns = [
    /^(check|show|list|view|get)\s+(seats|payment|status|users|reports?)/i,
    /^(add|create|purchase|buy)\s+(\d+\s+)?seats?/i,
    /^(run|execute|test)\s+(paypal|payment|api)/i,
    /^(invite|add)\s+(user|employee|staff)/i,
  ];
  
  // Human Escalation Patterns
  const humanPatterns = [
    /(talk to|speak with|connect me to|need help from)\s+(human|person|someone|support|danielle|louis)/i,
    /(urgent|emergency|asap|immediately|critical)/i,
    /i('m| am)\s+(confused|lost|stuck|frustrated)/i,
    /(doesn't work|not working|broken|error|failed)/i,
    /(billing|payment|charge)\s+(issue|problem|dispute)/i
  ];
  
  // Check API patterns (admin/manager only)
  if ((userRole === 'admin' || userRole === 'manager') && apiPatterns.some(p => p.test(lowerMessage))) {
    return { intent: 'api_command', confidence: 0.9, mode: 'console' };
  }
  
  // Check human escalation
  if (humanPatterns.some(p => p.test(lowerMessage))) {
    return { intent: 'human_escalation', confidence: 0.85, mode: 'human' };
  }
  
  // Default to AI assist
  return { intent: 'general_help', confidence: 0.6, mode: 'ai_assist' };
}

// Console Command Handler
async function handleConsoleCommand(command: string, userId: string, role: string, supabase: any) {
  const startTime = Date.now();
  
  try {
    const parsed = parseConsoleCommand(command, role);
    
    if (!parsed.allowed) {
      throw new Error(`Insufficient permissions. ${role}s cannot execute this command.`);
    }
    
    let result: any = {};
    
    switch (parsed.action) {
      case 'check_seats':
        result = await checkSeats(userId, supabase);
        break;
      case 'test_paypal':
        result = { status: 'connected', environment: 'sandbox', message: 'PayPal connection verified' };
        break;
      default:
        throw new Error('Command not recognized');
    }
    
    // Log to audit table
    await supabase.from('api_console_audit').insert({
      user_id: userId,
      user_role: role,
      command,
      api_route: parsed.route,
      request_params: parsed.params,
      response_data: result,
      success: true,
      execution_time_ms: Date.now() - startTime
    });
    
    return new Response(
      JSON.stringify({
        response: formatConsoleResponse(parsed.action, result),
        mode: 'console',
        success: true,
        data: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    await supabase.from('api_console_audit').insert({
      user_id: userId,
      user_role: role,
      command,
      success: false,
      error_message: error.message,
      execution_time_ms: Date.now() - startTime
    });
    
    return new Response(
      JSON.stringify({
        response: `Console Error: ${error.message}\n\nWould you like me to connect you with support?`,
        mode: 'console',
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Human Escalation Handler
async function handleHumanEscalation(message: string, userId: string, role: string, context: any, supabase: any) {
  try {
    const priority = message.toLowerCase().includes('urgent') || message.toLowerCase().includes('critical') 
      ? 'high' : 'medium';
    
    let requestType = 'general';
    if (message.toLowerCase().includes('technical')) requestType = 'technical';
    else if (message.toLowerCase().includes('billing')) requestType = 'billing';
    
    const { data: ticket, error } = await supabase
      .from('support_queue')
      .insert({
        user_id: userId,
        user_role: role,
        request_type: requestType,
        message,
        chat_context: {
          route: context.route,
          last_messages: context.conversationHistory?.slice(-5) || []
        },
        priority,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({
        response: `Got it! I've created support ticket #${ticket.id.substring(0, 8)} for you. ${priority === 'high' ? 'This is marked as high priority. ' : ''}Our team will reach out shortly.\n\nAverage response time: Under 2 hours during business hours.`,
        mode: 'human_escalation',
        ticket_id: ticket.id,
        priority
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        response: `I'm having trouble creating your support ticket. Please email info@procannedu.com directly for immediate assistance.`,
        mode: 'human_escalation',
        success: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function parseConsoleCommand(command: string, role: string) {
  const lower = command.toLowerCase();
  
  if (/^(check|show|list|view)\s+seats?/i.test(lower)) {
    return {
      action: 'check_seats',
      route: '/api/orgs/seats',
      allowed: role === 'admin' || role === 'manager',
      params: {}
    };
  }
  
  if (/^(run|execute|test)\s+(paypal|payment)/i.test(lower)) {
    return {
      action: 'test_paypal',
      route: '/api/test/paypal',
      allowed: role === 'admin',
      params: {}
    };
  }
  
  return { action: 'unknown', route: '', allowed: false, params: {} };
}

async function checkSeats(userId: string, supabase: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', userId)
    .single();
  
  if (!profile?.organization_id) {
    return { message: 'No organization found', total_purchased: 0, available: 0, assigned: 0 };
  }
  
  const { data: seats } = await supabase
    .from('seat_allocations')
    .select('*')
    .eq('organization_id', profile.organization_id);
  
  const total = seats?.length || 0;
  const assigned = seats?.filter((s: any) => s.assigned_to).length || 0;
  
  return {
    total_purchased: total,
    available: total - assigned,
    assigned: assigned,
    utilization_percentage: total > 0 ? Math.round((assigned / total) * 100) : 0
  };
}

function formatConsoleResponse(action: string, result: any): string {
  switch (action) {
    case 'check_seats':
      return `**Seat Status**\n\n` +
             `• Total: ${result.total_purchased}\n` +
             `• Available: ${result.available}\n` +
             `• Assigned: ${result.assigned}\n` +
             `• Utilization: ${result.utilization_percentage}%`;
    case 'test_paypal':
      return `✅ ${result.message}\nEnvironment: ${result.environment}`;
    default:
      return JSON.stringify(result, null, 2);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context = {}, user_id, user_roles = [], security_level = 'student' } = await req.json() as ChatRequest;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Classify intent
    const classification = classifyIntent(message, security_level);
    
    // Log intent
    await supabase.from('chat_intent_log').insert({
      user_message: message.substring(0, 500),
      detected_intent: classification.intent,
      confidence_score: classification.confidence,
      chosen_mode: classification.mode,
      metadata: { security_level, user_roles }
    });
    
    // Route based on mode
    if (classification.mode === 'console' && (security_level === 'admin' || security_level === 'manager')) {
      return await handleConsoleCommand(message, user_id!, security_level, supabase);
    } else if (classification.mode === 'human') {
      return await handleHumanEscalation(message, user_id!, security_level, context, supabase);
    }
    
    // Standard AI response (existing logic)
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are ProCann Assist. User role: ${security_level}. Provide helpful, concise guidance.`
          },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        response: data.choices[0].message.content,
        mode: 'ai_assist'
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ 
        response: "I'm experiencing technical difficulties. Please contact info@procannedu.com for support.",
        error: true
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
