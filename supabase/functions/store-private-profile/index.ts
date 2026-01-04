import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Encrypts a string using AES-GCM with the PII encryption key
 */
async function encryptValue(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine IV + ciphertext and base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return base64Encode(combined);
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

    const { user_id, phone, address, dob, emergency_contact, mca_number } = await req.json();
    
    // Users can only update their own profile, or admins can update any
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user is admin
    const { data: adminCheck } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    const isAdmin = !!adminCheck;
    const targetUserId = user_id || user.id;
    
    if (targetUserId !== user.id && !isAdmin) {
      console.error('Unauthorized: user tried to update another user profile', { userId: user.id, targetUserId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get encryption key
    const encryptionKey = await getEncryptionKey();
    
    // Encrypt each field that has a value
    const encryptedData: Record<string, Uint8Array | null> = {
      phone_encrypted: null,
      address_encrypted: null,
      dob_encrypted: null,
      emergency_contact_encrypted: null,
      mca_number_encrypted: null,
    };

    if (phone) {
      const encrypted = await encryptValue(phone, encryptionKey);
      encryptedData.phone_encrypted = base64Decode(encrypted);
    }
    if (address) {
      const encrypted = await encryptValue(address, encryptionKey);
      encryptedData.address_encrypted = base64Decode(encrypted);
    }
    if (dob) {
      const encrypted = await encryptValue(dob, encryptionKey);
      encryptedData.dob_encrypted = base64Decode(encrypted);
    }
    if (emergency_contact) {
      const encrypted = await encryptValue(emergency_contact, encryptionKey);
      encryptedData.emergency_contact_encrypted = base64Decode(encrypted);
    }
    if (mca_number) {
      const encrypted = await encryptValue(mca_number, encryptionKey);
      encryptedData.mca_number_encrypted = base64Decode(encrypted);
    }

    // Upsert into profiles_private
    const { error: upsertError } = await serviceClient
      .from('profiles_private')
      .upsert({
        user_id: targetUserId,
        ...encryptedData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store private profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Private profile stored successfully for user:', targetUserId);

    return new Response(
      JSON.stringify({ success: true, message: 'Private profile stored securely' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in store-private-profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
