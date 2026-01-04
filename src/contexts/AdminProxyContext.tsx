import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProxySession {
  id: string;
  originalAdminId: string;
  originalAdminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;
  startedAt: Date;
  expiresAt: Date;
}

interface AdminProxyContextType {
  isProxyMode: boolean;
  proxySession: ProxySession | null;
  startProxySession: (targetUserId: string) => Promise<boolean>;
  endProxySession: () => Promise<void>;
  isLoading: boolean;
}

const AdminProxyContext = createContext<AdminProxyContextType | undefined>(undefined);

export const AdminProxyProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [proxySession, setProxySession] = useState<ProxySession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for active proxy session on mount (server-side validation)
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Check if current user has an active proxy session as admin
        const { data: activeSession } = await supabase
          .from('admin_proxy_sessions')
          .select('*')
          .eq('admin_user_id', session.user.id)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (activeSession) {
          // Fetch target user info
          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email_cache')
            .eq('user_id', activeSession.target_user_id)
            .maybeSingle();

          setProxySession({
            id: activeSession.id,
            originalAdminId: activeSession.admin_user_id,
            originalAdminEmail: session.user.email || '',
            targetUserId: activeSession.target_user_id,
            targetUserEmail: targetProfile?.email_cache || '',
            targetUserName: targetProfile ? `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.trim() : '',
            startedAt: new Date(activeSession.created_at),
            expiresAt: new Date(activeSession.expires_at),
          });
        }
      } catch (err) {
        console.error('[AdminProxy] Error checking session:', err);
      }
    };

    checkActiveSession();
  }, []);

  const startProxySession = useCallback(async (targetUserId: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Get current admin session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Error",
          description: "You must be logged in as an admin to use proxy mode.",
          variant: "destructive",
        });
        return false;
      }

      // Store original admin info before switching
      const originalAdmin = {
        id: session.user.id,
        email: session.user.email || '',
      };

      // Call edge function to generate impersonation session
      // The edge function creates the server-side session record
      const { data, error } = await supabase.functions.invoke('admin-impersonate-user', {
        body: { targetUserId },
      });

      if (error || !data?.success) {
        console.error('[AdminProxy] Impersonation failed:', error || data?.error);
        toast({
          title: "Impersonation Failed",
          description: data?.error || error?.message || "Could not start proxy session.",
          variant: "destructive",
        });
        return false;
      }

      // Create proxy session record in state (session is stored server-side by edge function)
      const newProxySession: ProxySession = {
        id: data.session_id,
        originalAdminId: originalAdmin.id,
        originalAdminEmail: originalAdmin.email,
        targetUserId,
        targetUserEmail: data.target_email,
        targetUserName: data.target_name || data.target_email,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      };

      setProxySession(newProxySession);

      // Use verifyOtp to sign in as the target user
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });

      if (otpError) {
        console.error('[AdminProxy] OTP verification failed:', otpError);
        setProxySession(null);
        toast({
          title: "Session Switch Failed",
          description: otpError.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Proxy Mode Active",
        description: `Now viewing as ${data.target_name || data.target_email}`,
      });

      // Reload to apply new session
      window.location.href = '/dashboard';
      return true;

    } catch (err) {
      console.error('[AdminProxy] Error:', err);
      toast({
        title: "Error",
        description: "Failed to start proxy session.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const endProxySession = useCallback(async () => {
    if (!proxySession) return;

    setIsLoading(true);
    
    try {
      // Call edge function to revoke the server-side session
      await supabase.functions.invoke('admin-end-proxy-session', {
        body: { sessionId: proxySession.id },
      });

      // Sign out from proxied session
      await supabase.auth.signOut();
      
      // Clear proxy session state
      setProxySession(null);

      toast({
        title: "Proxy Mode Ended",
        description: "Please sign back in as yourself.",
      });

      // Redirect to sign-in page
      window.location.href = '/sign-in';

    } catch (err) {
      console.error('[AdminProxy] Error ending session:', err);
      toast({
        title: "Error",
        description: "Failed to end proxy session. Please sign out manually.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [proxySession, toast]);

  return (
    <AdminProxyContext.Provider
      value={{
        isProxyMode: !!proxySession,
        proxySession,
        startProxySession,
        endProxySession,
        isLoading,
      }}
    >
      {children}
    </AdminProxyContext.Provider>
  );
};

export const useAdminProxy = () => {
  const context = useContext(AdminProxyContext);
  if (context === undefined) {
    throw new Error('useAdminProxy must be used within an AdminProxyProvider');
  }
  return context;
};
