import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, LogIn, LayoutDashboard, RefreshCw, Wifi, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a short support code for error tracking
 */
const generateSupportCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PC-ERR-${timestamp.slice(-4)}${random}`;
};

interface RecoveryScreenProps {
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
  onRetry?: () => void;
}

/**
 * ProCann branded Recovery Screen
 * 
 * Replaces the generic "Something went wrong" with a professional,
 * actionable recovery experience that:
 * - Shows a clear, non-scary message
 * - Provides role-appropriate navigation options
 * - Logs the error with a support code
 * - Works even when hooks can't be used (class component fallback)
 */
export const RecoveryScreen: React.FC<RecoveryScreenProps> = ({
  error,
  errorInfo,
  onRetry,
}) => {
  const supportCode = useMemo(() => generateSupportCode(), []);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check if user has an active session
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setHasSession(!!data.session);
      } catch (e) {
        console.error('[RecoveryScreen] Session check failed:', e);
        setHasSession(false);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    // Log the error with support code
    console.error(`[ProCann Recovery] ${supportCode}`, {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }, [error, errorInfo, supportCode]);

  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="text-center pb-4">
          {/* ProCann Branding */}
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            We hit a snag
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Clear, non-scary message */}
          <p className="text-center text-muted-foreground">
            Your session or connection may have expired. Choose an option below to continue.
          </p>

          {/* Primary Actions */}
          <div className="space-y-3">
            {isCheckingSession ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : hasSession ? (
              <>
                {/* User is logged in - show dashboard as primary */}
                <Button
                  onClick={() => handleNavigate('/student-dashboard')}
                  className="w-full gap-2"
                  size="lg"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => handleNavigate('/')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Home className="h-5 w-5" />
                  Home
                </Button>
              </>
            ) : (
              <>
                {/* User is not logged in - show sign in as primary */}
                <Button
                  onClick={() => handleNavigate('/auth')}
                  className="w-full gap-2"
                  size="lg"
                >
                  <LogIn className="h-5 w-5" />
                  Sign In
                </Button>
                <Button
                  onClick={() => handleNavigate('/')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Home className="h-5 w-5" />
                  Home
                </Button>
              </>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-2 justify-center pt-4 border-t border-muted">
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button
              onClick={handleReload}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <Wifi className="h-4 w-4" />
              Reload Page
            </Button>
          </div>

          {/* Support code and help link */}
          <div className="text-center pt-4 border-t border-muted space-y-2">
            <p className="text-xs text-muted-foreground font-mono">
              Support code: {supportCode}
            </p>
            <Button
              variant="link"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary gap-1 p-0 h-auto"
              onClick={() => handleNavigate('/faq')}
            >
              <HelpCircle className="h-3 w-3" />
              Need help? Visit our FAQ
            </Button>
          </div>

          {/* Dev-only error details */}
          {import.meta.env.DEV && error && (
            <details className="bg-muted/50 p-3 rounded-md text-xs border border-muted">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Developer Details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-destructive/80 overflow-auto max-h-32">
                {error.toString()}
                {errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecoveryScreen;
