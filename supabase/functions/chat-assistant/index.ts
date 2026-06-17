import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  GUARDRAIL_BLOCK,
  filterOutput,
  verifiedFactsBlock,
  todayISO,
} from "../_shared/prompt-guardrail.ts";
import {
  localizedPromptHead,
  normalizeChatLanguage,
  type ChatLanguage,
} from "../_shared/localized-prompts.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  /** ISO 639-1 code from the client (en, es, zh). Resolved server-side; falls back to profile or 'en'. */
  user_language?: string;
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
    if (!lovableApiKey) {
      throw new Error('Lovable API key not configured');
    }

    const { message, context = {}, user_language: clientLanguage } = await req.json() as ChatRequest;

    if (!message || !context) {
      throw new Error('Message and context are required');
    }

    // Resolve user language: explicit client value > (later) profile > 'en'.
    let userLanguage: ChatLanguage = normalizeChatLanguage(clientLanguage);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- JWT Authentication & Server-side role resolution ---
    let user_id: string | undefined;
    let user_roles: string[] = ['student']; // Default
    let security_level = 'student';

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        user_id = user.id;
        // Query actual roles from database
        const { data: dbRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        if (dbRoles && dbRoles.length > 0) {
          user_roles = dbRoles.map(r => r.role);
          if (user_roles.includes('admin')) security_level = 'admin';
          else if (user_roles.includes('dispensary_manager')) security_level = 'manager';
          else if (user_roles.includes('training_coordinator')) security_level = 'manager';
        }
      }
    }

    // Use ANON key for regulatory content lookup (RLS-scoped)
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

    // Check if message is about regulations/compliance/COMAR
    const isRegulationQuery = message.toLowerCase().includes('comar') || 
                              message.toLowerCase().includes('regulation') ||
                              message.toLowerCase().includes('law') ||
                              message.toLowerCase().includes('compliance') ||
                              message.toLowerCase().includes('maryland') ||
                              message.toLowerCase().includes('mca') ||
                              message.toLowerCase().includes('14.17');

    let regulatoryContext = '';
    
    if (isRegulationQuery) {
      console.log('Detected regulatory query, searching COMAR database...');
      
      // Search regulatory_content for relevant Maryland COMAR sections
      const { data: regulations, error: regError } = await supabaseAnon
        .from('regulatory_content')
        .select('section_number, section_title, content_text')
        .eq('state', 'Maryland')
        .textSearch('content_text', message.replace(/[^\w\s]/g, ' '))
        .limit(3);

      if (regulations && regulations.length > 0) {
        console.log(`Found ${regulations.length} relevant COMAR sections`);
        
        regulatoryContext = `\n\n=== RELEVANT MARYLAND COMAR SECTIONS ===\n`;
        regulatoryContext += regulations
          .map(r => `
COMAR ${r.section_number}: ${r.section_title}
${r.content_text.substring(0, 800)}...
---`)
          .join('\n');
        
        regulatoryContext += `\n=== END REGULATORY CONTENT ===\n
IMPORTANT: When citing these regulations:
- Always reference the specific COMAR section number (e.g., "COMAR 14.17.05.09")
- Quote directly from the content above when relevant
- Explain in plain language what the regulation means for Maryland cannabis workers
- Link to related training modules if applicable
`;
      } else {
        console.log('No COMAR sections found for query');
      }
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
    // GUARDRAIL_BLOCK and verifiedFactsBlock are prepended to close CHATBOT-SEC-01 and CHATBOT-ACC-01/02.
    const enhancedSystemPrompt = `${GUARDRAIL_BLOCK}

${verifiedFactsBlock(todayISO())}

${context.systemPrompt ?? ''}
${regulatoryContext}

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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
      // Handle rate limiting and payment errors
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
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            response: "The AI service is temporarily unavailable. Please contact support.",
            error: true,
            errorType: 'payment_required'
          }), 
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const errorData = await response.json();
      console.error('Lovable AI API error:', errorData);
      throw new Error(`Lovable AI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0].message.content;
    const assistantResponse = filterOutput(rawResponse, { fn: 'chat-assistant', userId: user_id });

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