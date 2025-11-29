import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckEmailRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email }: CheckEmailRequest = await req.json();
    
    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Checking email existence for:', email);

    // Use efficient direct email lookup instead of listing all users
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);
    
    if (error) {
      // If error is "User not found", that means email doesn't exist
      if (error.message?.includes('not found') || error.status === 404) {
        console.log('Email does not exist:', email);
        return new Response(
          JSON.stringify({ exists: false }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Other errors
      console.error('Error checking email:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check email', exists: false }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const emailExists = !!data?.user;
    console.log('Email exists:', emailExists);

    return new Response(
      JSON.stringify({ exists: emailExists }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in check-email-exists function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', exists: false }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);