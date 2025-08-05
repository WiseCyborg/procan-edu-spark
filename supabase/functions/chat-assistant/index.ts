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

    const { message, context, user_id }: ChatRequest = await req.json();

    if (!message || !context) {
      throw new Error('Message and context are required');
    }

    // Enhanced system prompt with cannabis industry knowledge
    const enhancedSystemPrompt = `${context.systemPrompt}

    Additional context:
    - Current page: ${context.route}
    - Maryland Cannabis Industry Focus: Regulatory compliance, RVT (Responsible Vendor Training), inventory tracking, seed-to-sale systems
    - Common compliance areas: Security requirements, product testing, labeling, advertising restrictions, employee training
    - ProCann Edu specializes in preparing professionals for Maryland's cannabis industry
    - Always be helpful, professional, and encouraging
    - If you don't know something specific about Maryland cannabis laws, recommend contacting info@procannedu.com
    - Keep responses concise but informative
    - Focus on practical, actionable advice
    
    Response guidelines:
    - Be conversational and friendly
    - Use cannabis industry terminology appropriately
    - Provide specific help based on the current page context
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