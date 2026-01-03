import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProxySession {
  originalAdminId: string;
  originalAdminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;
  startedAt: Date;
}

interface AdminProxyContextType {
  isProxyMode: boolean;
  proxySession: ProxySession | null;
  startProxySession: (targetUserId: string) => Promise<boolean>;
  endProxySession: () => Promise<void>;
  isLoading: boolean;
}

const AdminProxyContext = createContext<AdminProxyContextType | undefined>(undefined);

const PROXY_SESSION_KEY = 'rvt_admin_proxy_session';

export const AdminProxyProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [proxySession, setProxySession] = useState<ProxySession | null>(() => {
    // Restore proxy session from sessionStorage on mount
    const stored = sessionStorage.getItem(PROXY_SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...parsed, startedAt: new Date(parsed.startedAt) };
      } catch {
        sessionStorage.removeItem(PROXY_SESSION_KEY);
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

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

      // Create proxy session record
      const newProxySession: ProxySession = {
        originalAdminId: originalAdmin.id,
        originalAdminEmail: originalAdmin.email,
        targetUserId,
        targetUserEmail: data.target_email,
        targetUserName: data.target_name || data.target_email,
        startedAt: new Date(),
      };

      // Store in sessionStorage so it persists across page loads
      sessionStorage.setItem(PROXY_SESSION_KEY, JSON.stringify(newProxySession));
      setProxySession(newProxySession);

      // Use verifyOtp to sign in as the target user
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });

      if (otpError) {
        console.error('[AdminProxy] OTP verification failed:', otpError);
        sessionStorage.removeItem(PROXY_SESSION_KEY);
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
      // Sign out from proxied session
      await supabase.auth.signOut();
      
      // Clear proxy session data
      sessionStorage.removeItem(PROXY_SESSION_KEY);
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
