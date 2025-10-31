import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type PayPalEnv = "sandbox" | "production";

/**
 * Get the active PayPal environment from database configuration
 * Falls back to PAYPAL_ENVIRONMENT env variable if DB is not configured
 */
export async function getActivePayPalEnv(): Promise<PayPalEnv> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("paypal_configuration")
      .select("environment")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[paypal-config] DB lookup failed, falling back to env:", error.message);
    }

    if (data?.environment) {
      console.log("[paypal-config] Using DB-configured environment:", data.environment);
      return data.environment as PayPalEnv;
    }

    // Fallback to environment variable
    const fallback = (Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox").toLowerCase();
    console.log("[paypal-config] Using env variable fallback:", fallback);
    return fallback === "production" ? "production" : "sandbox";
  } catch (error) {
    console.error("[paypal-config] Error fetching environment:", error);
    return "sandbox"; // Safe default
  }
}

/**
 * Resolve PayPal credentials and API base URL based on environment
 */
export function resolvePayPalCreds(env: PayPalEnv) {
  // Try dual credentials first (new setup)
  const id = env === "production"
    ? Deno.env.get("PAYPAL_PRODUCTION_CLIENT_ID")
    : Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID");

  const secret = env === "production"
    ? Deno.env.get("PAYPAL_PRODUCTION_CLIENT_SECRET")
    : Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET");

  // Fallback to legacy credentials if dual setup not available
  const legacyId = Deno.env.get("PAYPAL_CLIENT_ID");
  const legacySecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

  const finalId = id || legacyId;
  const finalSecret = secret || legacySecret;

  if (!finalId || !finalSecret) {
    throw new Error(`[paypal-config] Missing PayPal credentials for ${env} environment`);
  }

  const baseUrl = env === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  console.log(`[paypal-config] Using ${env} credentials with base URL: ${baseUrl}`);

  return { id: finalId, secret: finalSecret, baseUrl };
}

/**
 * Check if an organization should be forced to use sandbox mode
 * Test organizations always use sandbox regardless of global setting
 */
export async function shouldForceTestMode(organizationId: string): Promise<boolean> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("organizations")
      .select("payment_status")
      .eq("id", organizationId)
      .maybeSingle();

    if (error) {
      console.error("[paypal-config] Error checking organization:", error);
      return false;
    }

    const isTest = data?.payment_status === "test";
    if (isTest) {
      console.log("[paypal-config] Forcing sandbox mode for test organization:", organizationId);
    }

    return isTest;
  } catch (error) {
    console.error("[paypal-config] Error in shouldForceTestMode:", error);
    return false;
  }
}

/**
 * Get PayPal environment with test organization override
 */
export async function getPayPalEnvForOrg(organizationId: string): Promise<PayPalEnv> {
  const forceTest = await shouldForceTestMode(organizationId);
  if (forceTest) {
    return "sandbox";
  }
  return await getActivePayPalEnv();
}
