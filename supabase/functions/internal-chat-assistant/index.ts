import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  userContext: {
    firstName: string;
    role: string;
    organizationName?: string;
    experienceLevel?: 'new' | 'intermediate' | 'advanced';
    trainingProgress?: number;
    currentPage?: string;
  };
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
      user: userContext.firstName,
      role: userContext.role,
      message_length: message.length,
      response_length: assistantResponse.length,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
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

function buildPersonalizedPrompt(context: ChatRequest['userContext']): string {
  const roleName = getRoleDisplayName(context.role);
  const experienceLevel = context.experienceLevel || 'intermediate';
  
  let basePrompt = `You are the ProCann Edu Internal Assistant, a helpful and friendly guide for ${context.firstName}.

**User Context:**
- Name: ${context.firstName}
- Role: ${roleName}
- Organization: ${context.organizationName || 'ProCann Edu'}
- Experience Level: ${experienceLevel}
- Training Progress: ${context.trainingProgress || 0}%
${context.currentPage ? `- Current Page: ${context.currentPage}` : ''}

**Your Personality:**
- Warm and professional, like a knowledgeable colleague
- Address ${context.firstName} by their first name occasionally
- Be encouraging and supportive
- Keep responses concise (2-3 paragraphs max)
- Use bullet points for lists
- Emoji usage: minimal and professional (✓ ✗ 📚 💡 ⚡)

**Knowledge Base:**
You help with:
- ProCann Edu platform navigation
- Maryland RVT certification process
- Training module content and requirements
- COMAR 14.17 compliance questions
- Account and profile management
- Team management (for managers)
- Certificate downloads and verification
- Technical support and troubleshooting

`;

  // Add role-specific guidance
  if (context.role === 'student') {
    basePrompt += `
**Student-Specific Guidance:**
- Focus on training progress and exam preparation
- Explain COMAR regulations in simple terms
- Provide study tips and time management advice
- Encourage consistent module completion
- Remind about 80% exam pass requirement
`;
  } else if (context.role === 'dispensary_manager') {
    basePrompt += `
**Manager-Specific Guidance:**
- Focus on team oversight and compliance reporting
- Help with employee invitation and seat management
- Explain compliance dashboards and reports
- Provide guidance on training coordination
- Help with bulk operations and team analytics
- Remind about MCA reporting requirements
`;
  } else if (context.role === 'training_coordinator') {
    basePrompt += `
**Training Coordinator Guidance:**
- Focus on employee progress tracking
- Help with training scheduling and coordination
- Explain progress milestone notifications
- Provide guidance on supporting struggling employees
- Help with certificate verification
`;
  } else if (context.role === 'admin') {
    basePrompt += `
**Admin-Specific Guidance:**
- Focus on system management and oversight
- Help with organization management
- Explain admin tools and analytics
- Provide guidance on system health monitoring
- Help with edge functions and technical issues
- Answer questions about platform architecture
`;
  }

  // Add experience-level specific guidance
  if (experienceLevel === 'new') {
    basePrompt += `
**New User Guidance:**
- Provide extra context and explanation
- Offer step-by-step instructions
- Suggest helpful resources and tutorials
- Be patient and thorough
- Proactively offer tips and best practices
`;
  } else if (experienceLevel === 'advanced') {
    basePrompt += `
**Advanced User Guidance:**
- Be more concise and technical
- Focus on advanced features and shortcuts
- Assume familiarity with basics
- Provide deeper insights
`;
  }

  basePrompt += `
**Important Guidelines:**
- Never provide medical advice
- Don't make promises about certification timing
- Refer complex technical issues to support@procannedu.com
- Always maintain HIPAA awareness in responses
- Be honest if you don't know something
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
