import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  context: {
    route: string;
    title: string;
    description: string;
    helpTips: string[];
    systemPrompt: string;
  };
  user_id?: string;
  user_roles?: string[];
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

    const { message, context, user_id, user_roles }: ChatRequest = await req.json();

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

    // Enhanced system prompt with cannabis industry knowledge and role awareness
    const enhancedSystemPrompt = `${context.systemPrompt}

    Additional context:
    - Current page: ${context.route}
    - User roles: ${user_roles?.join(', ') || 'student'}
    ${roleContext}
    
    Platform Knowledge:
    - Maryland Cannabis Industry Focus: Regulatory compliance, RVT (Responsible Vendor Training), inventory tracking, seed-to-sale systems
    - Common compliance areas: Security requirements, product testing, labeling, advertising restrictions, employee training
    - ProCann Edu specializes in preparing professionals for Maryland's cannabis industry
    - Security: Multi-factor authentication, encrypted data, HIPAA-compliant storage, audit logging
    - Access Control: Role-based permissions, manager assignments by ProCann Admin
    - Always be helpful, professional, and encouraging
    - If you don't know something specific about Maryland cannabis laws, recommend contacting info@procannedu.com
    - Keep responses concise but informative
    - Focus on practical, actionable advice based on user's role
    
    Response guidelines:
    - Be conversational and friendly
    - Use cannabis industry terminology appropriately
    - Provide specific help based on the current page context AND user role
    - For managers: Include security and oversight responsibilities
    - For students: Focus on learning and compliance
    - For admins: Emphasize system management and organizational oversight
    - Always end support requests by mentioning info@procannedu.com for additional help
    - Encourage users to complete their training for career advancement`;

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
        context: context.route
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