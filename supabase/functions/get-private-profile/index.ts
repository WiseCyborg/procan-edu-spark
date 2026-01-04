import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Decrypts a value encrypted with AES-GCM
 */
async function decryptValue(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = base64Decode(encryptedBase64);
  
  // Extract IV (first 12 bytes) and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

/**
 * Derives an AES key from the base64-encoded encryption key
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBase64 = Deno.env.get('PII_ENCRYPTION_KEY');
  if (!keyBase64) {
    throw new Error('PII_ENCRYPTION_KEY not configured');
  }
  
  const keyBytes = base64Decode(keyBase64);
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('user_id') || user.id;
    
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check authorization: user can view own profile, admin/manager can view others
    if (targetUserId !== user.id) {
      const { data: roleCheck } = await serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'manager'])
        .limit(1);
      
      if (!roleCheck || roleCheck.length === 0) {
        console.error('Unauthorized: user tried to view another user profile', { userId: user.id, targetUserId });
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // If manager, verify same organization
      const managerRole = roleCheck.find(r => r.role === 'manager');
      if (managerRole && !roleCheck.find(r => r.role === 'admin')) {
        // Get manager's org
        const { data: managerProfile } = await serviceClient
          .from('profiles')
          .select('active_organization_id')
          .eq('id', user.id)
          .single();
        
        // Get target user's org
        const { data: targetProfile } = await serviceClient
          .from('profiles')
          .select('active_organization_id')
          .eq('id', targetUserId)
          .single();
        
        if (!managerProfile?.active_organization_id || 
            managerProfile.active_organization_id !== targetProfile?.active_organization_id) {
          console.error('Unauthorized: manager tried to view user from different org');
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fetch encrypted data
    const { data: privateProfile, error: fetchError } = await serviceClient
      .from('profiles_private')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch private profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!privateProfile) {
      return new Response(
        JSON.stringify({ 
          user_id: targetUserId,
          phone: null,
          address: null,
          dob: null,
          emergency_contact: null,
          mca_number: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt fields
    const encryptionKey = await getEncryptionKey();
    
    const decryptField = async (encrypted: Uint8Array | null): Promise<string | null> => {
      if (!encrypted) return null;
      try {
        const base64 = base64Encode(encrypted);
        return await decryptValue(base64, encryptionKey);
      } catch (e) {
        console.error('Decryption error:', e);
        return null;
      }
    };

    const decryptedProfile = {
      user_id: targetUserId,
      phone: await decryptField(privateProfile.phone_encrypted),
      address: await decryptField(privateProfile.address_encrypted),
      dob: await decryptField(privateProfile.dob_encrypted),
      emergency_contact: await decryptField(privateProfile.emergency_contact_encrypted),
      mca_number: await decryptField(privateProfile.mca_number_encrypted),
    };

    console.log('Private profile retrieved for user:', targetUserId);

    return new Response(
      JSON.stringify(decryptedProfile),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-private-profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
