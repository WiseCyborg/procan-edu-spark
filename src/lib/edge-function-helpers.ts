import { supabase } from '@/integrations/supabase/client';

export interface EdgeFunctionResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Invoke an edge function with robust error handling
 * @param functionName Name of the edge function to invoke
 * @param body Request body
 * @returns Result with data or user-friendly error message
 */
export async function invokeEdgeFunction<T>(
  functionName: string, 
  body: any
): Promise<EdgeFunctionResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    
    if (error) {
      // Check for specific error types
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return { 
          data: null, 
          error: "Request is taking longer than expected. We'll email you when it's complete." 
        };
      } else if (error.message.includes('seat') || error.message.includes('credit')) {
        return { 
          data: null, 
          error: "No available seats. Please contact your manager to purchase more." 
        };
      } else if (error.message.includes('payment') || error.message.includes('transaction')) {
        return {
          data: null,
          error: "Payment processing error. Please try again or contact support if the issue persists."
        };
      } else if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        return {
          data: null,
          error: "You don't have permission to perform this action. Please contact your administrator."
        };
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        return {
          data: null,
          error: "The requested resource was not found. Please refresh the page and try again."
        };
      } else {
        return { 
          data: null, 
          error: "An error occurred. Please try again or contact support if the issue persists." 
        };
      }
    }
    
    return { data, error: null };
  } catch (err) {
    console.error(`Error invoking ${functionName}:`, err);
    
    // Check for network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return { 
        data: null, 
        error: "Network error. Please check your connection and try again." 
      };
    }
    
    return { 
      data: null, 
      error: "An unexpected error occurred. Please try again later." 
    };
  }
}

/**
 * Retry an edge function call with exponential backoff
 * @param functionName Name of the edge function
 * @param body Request body
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in ms
 */
export async function invokeEdgeFunctionWithRetry<T>(
  functionName: string,
  body: any,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<EdgeFunctionResult<T>> {
  let lastError: string | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await invokeEdgeFunction<T>(functionName, body);
    
    if (result.data !== null) {
      return result;
    }
    
    lastError = result.error;
    
    // Don't retry on certain errors
    if (
      result.error?.includes('permission') ||
      result.error?.includes('not found') ||
      result.error?.includes('unauthorized')
    ) {
      return result;
    }
    
    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, attempt)));
    }
  }
  
  return {
    data: null,
    error: lastError || 'Request failed after multiple attempts. Please try again later.'
  };
}