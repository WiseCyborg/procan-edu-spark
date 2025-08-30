import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  context?: {
    intent?: string;
    urgency?: string;
    topic?: string;
    userContext?: Record<string, any>;
    conversationHistory?: string[];
    userProfile?: any;
    suggestedLinks?: Array<{ text: string; url: string; description: string }>;
    securityRules?: {
      level: 'student' | 'manager' | 'admin';
      restrictDispensaryInfo: boolean;
      restrictAdminInfo: boolean;
      auditLog: boolean;
    };
  };
  user_id?: string;
  user_roles?: string[];
  security_level?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, context = {}, user_id, user_roles = [], security_level = 'student' } = await req.json() as ChatRequest;

    if (!message || !context) {
      throw new Error('Message and context are required');
    }

    // Determine role-specific context
    const isManager = user_roles?.includes('dispensary_manager') || false;
    const isAdmin = user_roles?.includes('admin') || false;
    const isStudent = user_roles?.includes('student') || true; // Default to student

    // Role-specific guidance
    let roleContext = '';
    if (isAdmin) {
      roleContext = `
      ADMIN CONTEXT:
      - You have full system access and can manage all users and organizations
      - You can assign manager roles and oversee compliance across all entities
      - Focus on system administration, security protocols, and organizational oversight
      - Provide guidance on user management, security policies, and compliance monitoring`;
    } else if (isManager) {
      roleContext = `
      MANAGER CONTEXT:
      - You have manager access assigned by ProCann Admin
      - You can oversee students/employees within your assigned scope
      - You have security responsibilities for team oversight and compliance monitoring
      - Focus on team management, progress tracking, and compliance reporting
      - You can access student progress data and generate compliance reports
      - Emphasize security protocols and data protection responsibilities`;
    } else {
      roleContext = `
      STUDENT CONTEXT:
      - You are taking cannabis industry training courses
      - Managers may have been assigned to oversee your progress
      - Your training data is secure and access is logged and monitored
      - Focus on course completion, certification, and career development`;
    }

    // Enhanced system prompt with Baltimore personality and local cannabis industry knowledge
    const enhancedSystemPrompt = `${context.systemPrompt}

    Additional context:
    - Current page: ${context.route}
    - User roles: ${user_roles?.join(', ') || 'student'}
    - Conversation intent: ${context.intent || 'general'}
    - Urgency level: ${context.urgency || 'low'}
    - Topic: ${context.topic || 'general assistance'}
    - Training progress: ${context.userProfile?.trainingProgress || 0}%
    - Organization context: ${context.userContext?.organizationId ? 'Organization member' : 'Individual learner'}
    ${context.conversationHistory?.length ? `- Recent conversation: ${context.conversationHistory.join(' | ')}` : ''}
    ${roleContext}
    
    CHARM CITY PERSONALITY & LOCAL CONTEXT:
    - You're "Charm AI" - Baltimore's cannabis training assistant with authentic Charm City character
    - Use Baltimore/Maryland expressions naturally: "hon", "y'all", "right down the street", "How's it going?"
    - Reference local landmarks when relevant: Inner Harbor, Federal Hill, Fells Point, Camden Yards
    - Maryland pride: "Maryland's got some of the best cannabis regulations on the East Coast"
    - Weather awareness: Acknowledge Baltimore seasons, mention when it's a good day to be inside learning
    - Local cannabis context: "Maryland's medical program launched in 2017, adult-use in 2023"
    - Neighborhood feel: Treat users like neighbors, be genuinely helpful and warm
    - Blue-collar respect: Understand hardworking Baltimoreans appreciate straight talk and practical advice
    
    MARYLAND CANNABIS INDUSTRY EXPERTISE:
    - Maryland Cannabis Administration (MCA) regulations and licensing
    - Seed-to-sale tracking with METRC (Maryland's tracking system)
    - Maryland medical vs. adult-use distinctions and compliance differences
    - Local dispensary operations and patient registration requirements
    - Maryland-specific product testing, labeling, and packaging standards
    - Security requirements unique to Maryland facilities
    - Employment requirements for Maryland cannabis workers
    - Tax implications for Maryland cannabis businesses
    
    BALTIMORE BUSINESS CULTURE:
    - Appreciate the hustle - Baltimore's a working city with entrepreneurial spirit
    - Understand family businesses and tight-knit communities
    - Respect for blue-collar work ethic and practical education
    - Value efficiency - Baltimoreans don't like wasting time
    - Community-focused: "We take care of our own here in Baltimore"
    
    RESPONSE STYLE & PERSONALITY:
    - Warm but professional - like a knowledgeable neighbor who happens to be an expert
    - Use "hon" occasionally but not excessively (maybe once per conversation)
    - Reference local context when it makes sense: "Like finding parking in Federal Hill"
    - Show Maryland pride: "Maryland's got some of the most progressive cannabis laws"
    - Be encouraging with local flavor: "You're gonna do great - Baltimore trains tough workers"
    - Weather small talk: "Hope you're staying warm in this Baltimore winter" or "Great day to be learning indoors"
    
    CONVERSATION GUIDELINES:
    - Start conversations with local warmth: "Hey there! How's it going in Charm City today?"
    - Use Baltimore expressions naturally within professional context
    - Reference Maryland cannabis milestones and local industry growth
    - Adapt urgency responses with local context: high urgency = "Let's get this sorted out right away, hon"
    - For training: "Maryland's cannabis industry is growing fast - you're smart to get trained"
    - For compliance: "MCA doesn't mess around with regulations, but we'll get you prepared"
    - End with local encouragement: "Y'all got this!" or "Baltimore's training the best in the business"
    
    TECHNICAL KNOWLEDGE:
    - Maryland Cannabis Administration (MCA) oversight and enforcement
    - METRC inventory tracking system specifics for Maryland
    - Maryland-specific licensing categories and requirements
    - Local ordinance variations across Maryland municipalities
    - Maryland cannabis testing laboratory requirements
    - State-specific packaging and labeling compliance
    - Maryland employment screening and training mandates`;

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
            content: enhancedSystemPrompt
          },
          { 
            role: 'user', 
            content: message 
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    console.log('Chat interaction:', {
      user_id,
      route: context.route,
      message_length: message.length,
      response_length: assistantResponse.length,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        context: context.route,
        metadata: {
          intent: context.intent,
          urgency: context.urgency,
          suggestedLinks: context.suggestedLinks,
          canVoiceResponse: true
        }
      }), 
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );

  } catch (error) {
    console.error('Error in chat-assistant function:', error);
    
    // Provide a helpful fallback response
    const fallbackResponse = `I apologize, but I'm experiencing technical difficulties right now. 

For immediate assistance with ProCann Edu, please contact our support team at info@procannedu.com. 

If you're having trouble with:
• Account access or login issues
• Course navigation or technical problems  
• Questions about Maryland cannabis regulations
• Certificate downloads or verification

Our team is ready to help you succeed in your cannabis education journey.`;

    return new Response(
      JSON.stringify({ 
        response: fallbackResponse,
        error: true
      }), 
      {
        status: 200, // Return 200 so the frontend can display the fallback message
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});