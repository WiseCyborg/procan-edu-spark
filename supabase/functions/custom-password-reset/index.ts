import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email: string;
  action: 'request' | 'verify' | 'update';
  token?: string;
  password?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { email, action, token, password }: PasswordResetRequest = await req.json();

    if (action === 'request') {
      console.log('Processing password reset request for:', email);

      // Clean up expired tokens first
      await supabase.rpc('cleanup_expired_password_reset_tokens');

      // Check if user exists
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) {
        console.error('Error fetching users:', userError);
        throw new Error('Failed to verify user');
      }

      const user = users.users.find(u => u.email === email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return new Response(
          JSON.stringify({ success: true, message: 'If the email exists, a reset link will be sent.' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Generate secure token
      const { data: tokenData, error: tokenError } = await supabase.rpc('generate_password_reset_token');
      if (tokenError) {
        console.error('Error generating token:', tokenError);
        throw new Error('Failed to generate reset token');
      }

      // Store token in database
      const { error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          email: email,
          token: tokenData,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
        });

      if (insertError) {
        console.error('Error storing token:', insertError);
        throw new Error('Failed to store reset token');
      }

      // Send password reset email via the branded email function
      const resetLink = `https://preview--procan-edu-spark.lovable.app/auth?mode=reset&token=${tokenData}&email=${encodeURIComponent(email)}`;
      
      const { error: emailError } = await supabase.functions.invoke('send-branded-email', {
        body: {
          to: email,
          subject: 'Password Reset Request - ProCann Edu',
          type: 'password-reset',
          data: {
            resetLink,
            email
          }
        }
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
        throw new Error('Failed to send reset email');
      }

      console.log('Password reset email sent successfully to:', email);

      return new Response(
        JSON.stringify({ success: true, message: 'Password reset email sent successfully.' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );

    } else if (action === 'verify') {
      // Verify token validity
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('email', email)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid or expired reset token.' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Token is valid.' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );

    } else if (action === 'update') {
      // Verify token and update password
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('email', email)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid or expired reset token.' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Update user password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        tokenData.user_id,
        { password }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw new Error('Failed to update password');
      }

      // Mark token as used
      await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      console.log('Password updated successfully for user:', tokenData.user_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Password updated successfully.' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action.' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in custom-password-reset function:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);