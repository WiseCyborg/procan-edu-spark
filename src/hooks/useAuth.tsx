
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        console.log('[AuthProvider] Initializing auth...');
        
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthProvider] Session error:', sessionError);
          setError(sessionError);
        }
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          console.log('[AuthProvider] Initial session loaded:', initialSession?.user?.email || 'no user');
        }
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('[AuthProvider] Auth state changed:', event, session?.user?.email || 'no user');
            if (mounted) {
              setSession(session);
              setUser(session?.user ?? null);
            }
          }
        );
        
        if (mounted) {
          setLoading(false);
        }

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
        
      } catch (err) {
        console.error('[AuthProvider] Fatal error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    initAuth();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthProvider] Sign out error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // If there's a fatal error, show it
  if (error && !user && !loading) {
    console.error('[AuthProvider] Rendering error state');
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Authentication Error</h2>
        <p style={{ marginBottom: '24px', color: '#6b7280' }}>{error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
