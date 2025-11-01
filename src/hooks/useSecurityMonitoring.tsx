import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SecurityEvent {
  event_type: string;
  details?: Record<string, any>;
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Rate limiting check
  const checkRateLimit = async (
    actionType: string,
    maxRequests: number = 10,
    windowMinutes: number = 60
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        _user_id: user.id,
        _action_type: actionType,
        _max_requests: maxRequests,
        _window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return false;
      }

      const allowed = data as boolean;
      setIsRateLimited(!allowed);

      if (!allowed) {
        toast.error(`Rate limit exceeded for ${actionType}. Please try again later.`);
      }

      return allowed;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return false;
    }
  };

  // Log security events
  const logSecurityEvent = async (event: SecurityEvent) => {
    if (!user) return;

    try {
      await supabase.rpc('log_security_event', {
        _event_type: event.event_type,
        _details: event.details || {}
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  // Common security checks for sensitive operations
  const performSecurityCheck = async (actionType: string): Promise<boolean> => {
    // Adjust limits for bulk admin operations
    const limits: Record<string, { max: number; window: number }> = {
      dispensary_approval: { max: 50, window: 60 }, // Bulk approvals: 50/hour
      dispensary_rejection: { max: 50, window: 60 }, // Bulk rejections: 50/hour
      test_org_creation: { max: 10, window: 60 },   // Test orgs: 10/hour
      default: { max: 5, window: 10 }                // Default: 5/10min
    };
    
    const limit = limits[actionType] || limits.default;
    const allowed = await checkRateLimit(actionType, limit.max, limit.window);
    
    if (allowed) {
      await logSecurityEvent({
        event_type: `${actionType}_attempted`,
        details: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });
    }

    return allowed;
  };

  // Specific rate limiters for common operations
  const rateLimiters = {
    certificateGeneration: () => checkRateLimit('certificate_generation', 3, 60),
    examSubmission: () => checkRateLimit('exam_submission', 5, 30),
    passwordReset: () => checkRateLimit('password_reset', 3, 60),
    loginAttempt: () => checkRateLimit('login_attempt', 10, 15),
    profileUpdate: () => checkRateLimit('profile_update', 10, 60),
    dispensaryApproval: () => checkRateLimit('dispensary_approval', 50, 60) // Bulk admin operations
  };

  return {
    isRateLimited,
    checkRateLimit,
    logSecurityEvent,
    performSecurityCheck,
    rateLimiters
  };
};