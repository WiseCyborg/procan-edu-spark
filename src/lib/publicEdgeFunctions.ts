const SUPABASE_URL = "https://zhmpwczrvitomsxjwpzc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA";

export type PublicFunctionResult<T = any> = {
  data: T | null;
  error: Error | null;
  status?: number;
  raw?: any;
};

/**
 * Invoke a public Supabase edge function without auth session
 *
 * This bypasses the Supabase client's automatic auth header injection,
 * which is necessary for public endpoints that don't require authentication
 * (e.g., password reset, token validation, public registrations)
 */
export async function invokePublicFunction<T = any>(
  functionName: string,
  body: Record<string, unknown>
): Promise<PublicFunctionResult<T>> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });

    const raw = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        data: null,
        error: new Error(raw?.error || raw?.message || `Request failed (${response.status})`),
        status: response.status,
        raw,
      };
    }

    return { data: raw as T, error: null, status: response.status, raw };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error occurred'),
    };
  }
}

