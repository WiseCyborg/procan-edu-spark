import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import {
  GUARDRAIL_BLOCK,
  filterOutput,
  verifiedFactsBlock,
  todayISO,
} from "../_shared/prompt-guardrail.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserContext {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  roles: string[];
  org_id: string | null;
  org_name: string | null;
  seat_status: {
    assigned: boolean;
    total_seats: number;
    available_seats: number;
    used_seats: number;
  };
  training_status: {
    enrolled: boolean;
    course_id: string | null;
    completion_percentage: number;
    current_module: number;
    total_modules: number;
    is_locked: boolean;
    locked_reason: string | null;
  };
  cert_status: {
    certified: boolean;
    certificate_id: string | null;
    certificate_number: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    is_expired: boolean;
  };
  pending_applications: number;
  pending_invitations: number;
  unregistered_managers: number;
  currentPage?: string;
}

interface ChatRequest {
  message: string;
  isAction?: boolean;
  userContext: UserContext;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!lovableApiKey) {
      throw new Error('Lovable API key not configured');
    }

    const { message, userContext, conversationHistory = [] } = await req.json() as ChatRequest;

    if (!message || !userContext) {
      throw new Error('Message and user context are required');
    }

    // Build personalized system prompt based on user context
    const systemPrompt = buildPersonalizedPrompt(userContext);

    // Prepare messages for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: message }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            response: "I'm experiencing high demand right now. Please try again in a moment.",
            error: true,
            errorType: 'rate_limit'
          }), 
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      const errorData = await response.json();
      console.error('Lovable AI API error:', errorData);
      throw new Error(`Lovable AI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    console.log('Internal chat interaction:', {
      user: userContext.first_name,
      role: userContext.role,
      message_length: message.length,
      response_length: assistantResponse.length,
      timestamp: new Date().toISOString()
    });

    // Generate suggested actions based on role
    const suggestedActions = getSuggestedActions(userContext.role);

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        suggestedActions,
        userContext: userContext
      }), 
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error) {
    console.error('Error in internal-chat-assistant function:', error);
    
    const fallbackResponse = `I apologize, but I'm experiencing technical difficulties right now. 
    
Please try again in a moment, or contact support at info@procannedu.com if the issue persists.`;

    return new Response(
      JSON.stringify({ 
        response: fallbackResponse,
        error: true
      }), 
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});

function buildPersonalizedPrompt(context: UserContext): string {
  const roleName = getRoleDisplayName(context.role);
  const firstName = context.first_name || 'User';
  
  let basePrompt = `You are ProCann Assist, a direct and operational assistant for ${firstName}.

**YOUR STYLE:**
- Address ${firstName} by first name in EVERY response
- Be direct and confident, not apologetic
- Keep responses SHORT (2-3 sentences max unless more is needed)
- Speak like: "Here's what's wrong, here's what I fixed, here's what still needs you."
- Never verbose. Never apologetic. Operational.

**USER'S LIVE CONTEXT:**
- Name: ${firstName} ${context.last_name || ''}
- Role: ${roleName}
- Organization: ${context.org_name || 'Not assigned'}
- Current Page: ${context.currentPage || 'Unknown'}

**SEAT STATUS:**
- Total Seats: ${context.seat_status.total_seats}
- Available: ${context.seat_status.available_seats}
- Used: ${context.seat_status.used_seats}

**TRAINING STATUS:**
- Progress: ${context.training_status.completion_percentage}%
- Current Module: ${context.training_status.current_module} of ${context.training_status.total_modules}
- Enrolled: ${context.training_status.enrolled ? 'Yes' : 'No'}

**CERTIFICATION STATUS:**
- Certified: ${context.cert_status.certified ? 'Yes' : 'No'}
${context.cert_status.certified ? `- Certificate #: ${context.cert_status.certificate_number}` : ''}
${context.cert_status.expiry_date ? `- Expires: ${context.cert_status.expiry_date}` : ''}
${context.cert_status.is_expired ? '- ⚠️ CERTIFICATE EXPIRED' : ''}

`;

  // Add role-specific operational context
  if (context.role === 'admin') {
    basePrompt += `
**ADMIN OPERATIONAL DATA:**
- Pending Applications: ${context.pending_applications}
- Unregistered Managers: ${context.unregistered_managers}
- Pending Invitations: ${context.pending_invitations}

**ADMIN ACTIONS YOU CAN HELP WITH:**
- Review pending applications
- Send registration reminders to unregistered managers
- Run pipeline health check
- Reconcile seat mismatches
- View system-wide metrics

When ${firstName} asks about the system, reference these real numbers.
Example: "${firstName} — you have ${context.pending_applications} pending applications. Want me to help you review them?"
`;
  } else if (context.role === 'dispensary_manager' || context.role === 'training_coordinator') {
    basePrompt += `
**MANAGER OPERATIONAL DATA:**
- Organization: ${context.org_name || 'Not set'}
- Seats Available: ${context.seat_status.available_seats} of ${context.seat_status.total_seats}
- Pending Invitations: ${context.pending_invitations}

**MANAGER ACTIONS YOU CAN HELP WITH:**
- Invite employees (if seats available)
- View join code
- Resend pending invitations
- Check team progress
- Generate compliance reports

When ${firstName} asks about their team, reference these real numbers.
Example: "${firstName} — ${context.org_name || 'Your org'} has ${context.seat_status.available_seats} seats available. Ready to invite someone?"
`;
  } else {
    // Student/Employee
    basePrompt += `
**STUDENT OPERATIONAL DATA:**
- Training Progress: ${context.training_status.completion_percentage}%
- Current Module: ${context.training_status.current_module}
- Modules Remaining: ${context.training_status.total_modules - context.training_status.current_module + 1}
- Certified: ${context.cert_status.certified ? 'Yes ✓' : 'Not yet'}

**STUDENT ACTIONS YOU CAN HELP WITH:**
- Resume training from current module
- Check why a module might be locked
- Help prepare for the final exam
- Download certificate (if certified)
- Troubleshoot progress not saving

When ${firstName} asks about their progress, be specific:
Example: "${firstName} — you're ${context.training_status.completion_percentage}% done. Module ${context.training_status.current_module} is next. Want to continue?"
`;
  }

  basePrompt += `
**CRITICAL RULES:**
- ALWAYS use ${firstName}'s first name in responses
- Reference their ACTUAL data (seats, progress, status) — don't make up numbers
- If they're blocked or stuck, explain WHY and give the NEXT ACTION
- Keep it short unless they ask for detail
- Never provide medical advice
- For complex tech issues → support@procannedu.com
`;

  return basePrompt;
}

function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    'student': 'Cannabis Agent',
    'dispensary_manager': 'Dispensary Manager',
    'training_coordinator': 'Training Coordinator',
    'admin': 'System Administrator'
  };
  return roleMap[role] || 'Team Member';
}

function getSuggestedActions(role: string): Array<{id: string; label: string; icon: string; action: string}> {
  if (role === 'admin') {
    return [
      { id: 'review-apps', label: 'Review Applications', icon: 'clipboard-list', action: 'review_pending_applications' },
      { id: 'health-check', label: 'Pipeline Health', icon: 'shield', action: 'run_pipeline_health' },
      { id: 'send-reminders', label: 'Send Reminders', icon: 'mail', action: 'send_registration_reminders' },
      { id: 'reconcile', label: 'Reconcile Seats', icon: 'refresh-cw', action: 'reconcile_seats' },
    ];
  }
  
  if (role === 'dispensary_manager' || role === 'training_coordinator') {
    return [
      { id: 'invite', label: 'Invite Employee', icon: 'users', action: 'invite_employee' },
      { id: 'view-code', label: 'View Join Code', icon: 'file-check', action: 'view_join_code' },
      { id: 'resend', label: 'Resend Invites', icon: 'mail', action: 'resend_invitations' },
      { id: 'allocate', label: 'Manage Seats', icon: 'settings', action: 'manage_seats' },
    ];
  }
  
  // Student / Employee
  return [
    { id: 'resume', label: 'Resume Course', icon: 'book-open', action: 'resume_course' },
    { id: 'unlock', label: 'Check Unlock', icon: 'refresh-cw', action: 'check_unlock_status' },
    { id: 'cert', label: 'Get Certificate', icon: 'file-check', action: 'get_certificate' },
  ];
}
