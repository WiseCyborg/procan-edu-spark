import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMultiChannelVerification } from '@/hooks/useMultiChannelVerification';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReauthSession {
  userId: string;
  verifiedAt: Date;
  expiresAt: Date;
  method: 'email' | 'sms';
}

export const useReauthentication = () => {
  const { user } = useAuth();
  const { startVerification, checkVerification, status } = useMultiChannelVerification();
  const { logSecurityEvent } = useSecurityMonitoring();
  const [reauthSessions, setReauthSessions] = useState<Map<string, ReauthSession>>(new Map());

  // Check if user has valid reauth session (valid for 30 minutes)
  const isRecentlyVerified = useCallback((operation: string): boolean => {
    if (!user) return false;
    
    const sessionKey = `${user.id}-${operation}`;
    const session = reauthSessions.get(sessionKey);
    
    if (!session || new Date() > session.expiresAt) {
      // Clean up expired session
      if (session) {
        reauthSessions.delete(sessionKey);
        setReauthSessions(new Map(reauthSessions));
      }
      return false;
    }
    
    return true;
  }, [user, reauthSessions]);

  // Start reauth process
  const initiateReauth = useCallback(async (operation: string, preferredMethod?: 'email' | 'sms') => {
    if (!user?.email) {
      toast.error('User email not available');
      return { success: false };
    }

    try {
      // Get user verification preferences
      const { data: profile } = await supabase
        .from('profiles')
        .select('verification_method_preference')
        .eq('user_id', user.id)
        .single();

      const { data: preferences } = await supabase
        .from('user_verification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Determine verification method
      const method = preferredMethod || 
        (preferences?.preferred_method === 'sms' && preferences?.phone_number ? 'sms' : 'email');

      // Log security event
      await logSecurityEvent({
        event_type: 'reauth_initiated',
        details: {
          operation,
          method,
          timestamp: new Date().toISOString()
        }
      });

      // Start verification
      const result = await startVerification({
        email: user.email,
        phone: preferences?.phone_number,
        delivery_method: method,
        purpose: 'login'
      });

      return { success: true, method };
    } catch (error) {
      console.error('Reauth initiation failed:', error);
      toast.error('Failed to initiate re-authentication');
      return { success: false };
    }
  }, [user, startVerification, logSecurityEvent]);

  // Verify reauth code
  const verifyReauth = useCallback(async (operation: string, code: string, method: 'email' | 'sms') => {
    if (!user?.email) return { success: false };

    try {
      const result = await checkVerification(user.email, code, 'login');
      
      if (result.verified) {
        // Create reauth session (valid for 30 minutes)
        const session: ReauthSession = {
          userId: user.id,
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          method
        };
        
        const sessionKey = `${user.id}-${operation}`;
        const newSessions = new Map(reauthSessions);
        newSessions.set(sessionKey, session);
        setReauthSessions(newSessions);

        // Log successful reauth
        await logSecurityEvent({
          event_type: 'reauth_success',
          details: {
            operation,
            method,
            timestamp: new Date().toISOString()
          }
        });

        toast.success('Re-authentication successful');
        return { success: true };
      } else {
        toast.error('Invalid verification code');
        return { success: false };
      }
    } catch (error) {
      console.error('Reauth verification failed:', error);
      toast.error('Re-authentication failed');
      return { success: false };
    }
  }, [user, checkVerification, reauthSessions, logSecurityEvent]);

  // Clear reauth session
  const clearReauthSession = useCallback((operation: string) => {
    if (!user) return;
    
    const sessionKey = `${user.id}-${operation}`;
    const newSessions = new Map(reauthSessions);
    newSessions.delete(sessionKey);
    setReauthSessions(newSessions);
  }, [user, reauthSessions]);

  return {
    isRecentlyVerified,
    initiateReauth,
    verifyReauth,
    clearReauthSession,
    status
  };
};