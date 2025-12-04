import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Setting up Louis's account ===");
    
    const email = 'louis@hendrickscompliance.com';
    const tempPassword = 'ProCann2025!Welcome';
    const organizationId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let userId: string;
    
    if (existingUser) {
      console.log("Louis already exists, updating password...");
      userId = existingUser.id;
      
      // Update password
      await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true
      });
    } else {
      console.log("Creating Louis's auth account...");
      
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: 'Louis',
          last_name: 'Hendricks'
        }
      });
      
      if (authError) {
        throw new Error(`Auth creation failed: ${authError.message}`);
      }
      
      userId = authUser.user.id;
      console.log("Auth user created:", userId);
    }
    
    // Create/update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        first_name: 'Louis',
        last_name: 'Hendricks',
        email_cache: email,
        organization_id: organizationId
      }, { onConflict: 'user_id' });
    
    if (profileError) {
      console.error("Profile error:", profileError);
    }
    
    // Assign admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin'
      }, { onConflict: 'user_id,role' });
    
    if (roleError) {
      console.error("Role error:", roleError);
    }
    
    // Send welcome email with temp password
    try {
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: email,
          firstName: 'Louis',
          lastName: 'Hendricks',
          tempPassword: tempPassword,
          organizationName: 'Hendricks Compliance',
          loginUrl: 'https://www.procannedu.com/auth'
        }
      });
      console.log("Welcome email sent");
    } catch (emailError) {
      console.error("Email send failed:", emailError);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Louis's account has been set up successfully",
      email: email,
      tempPassword: tempPassword,
      userId: userId
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
    
  } catch (error: any) {
    console.error("Setup error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});
