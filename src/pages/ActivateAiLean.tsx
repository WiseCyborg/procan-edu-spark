import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const ActivateAiLean = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'expired'>('validating');
  const [tokenData, setTokenData] = useState<any>(null);

  useEffect(() => {
    validateToken();
  }, [searchParams]);

  const validateToken = async () => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('invalid');
      return;
    }

    try {
      // Validate token
      const { data, error } = await supabase
        .from('ailean_activation_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) {
        setStatus('invalid');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      // Check if uses remaining
      if (data.uses_remaining <= 0) {
        setStatus('expired');
        return;
      }

      setTokenData(data);
      setStatus('valid');

      // If user is already logged in, activate directly
      if (user) {
        await activateAiLean(data);
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setStatus('invalid');
    }
  };

  const activateAiLean = async (token: any) => {
    try {
      // Decrement uses_remaining
      const { error: updateError } = await supabase
        .from('ailean_activation_tokens')
        .update({ uses_remaining: token.uses_remaining - 1 })
        .eq('id', token.id);

      if (updateError) throw updateError;

      toast.success('AiLean activated! Redirecting to dashboard...');
      
      // Redirect to manager dashboard with AiLean open
      setTimeout(() => {
        navigate('/dispensary-manager-dashboard?ailean=open');
      }, 1500);
    } catch (error) {
      console.error('Error activating AiLean:', error);
      toast.error('Failed to activate AiLean');
    }
  };

  const handleLogin = () => {
    // Store return URL with token
    sessionStorage.setItem('ailean_activation_token', searchParams.get('token') || '');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'validating' && (
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            )}
            {status === 'valid' && (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
            {(status === 'invalid' || status === 'expired') && (
              <XCircle className="w-16 h-16 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'validating' && 'Validating Activation...'}
            {status === 'valid' && 'AiLean Activation'}
            {status === 'invalid' && 'Invalid Token'}
            {status === 'expired' && 'Token Expired'}
          </CardTitle>
          <CardDescription>
            {status === 'validating' && 'Please wait while we verify your activation token...'}
            {status === 'valid' && !user && 'Sign in to activate AiLean coaching on your mobile device'}
            {status === 'valid' && user && 'Activating your AiLean access...'}
            {status === 'invalid' && 'This activation link is not valid. Please contact your dispensary manager.'}
            {status === 'expired' && 'This activation link has expired or reached its usage limit.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'valid' && !user && (
            <>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✋ Voice-activated workplace coaching</p>
                <p>🎯 Personalized management guidance</p>
                <p>🔒 Secure, role-based access</p>
                <p>📱 Optimized for mobile use</p>
              </div>
              <Button onClick={handleLogin} className="w-full" size="lg">
                Sign In to Activate
              </Button>
            </>
          )}
          
          {status === 'valid' && user && (
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Setting up your AiLean access...</p>
            </div>
          )}

          {(status === 'invalid' || status === 'expired') && (
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Return to Home
            </Button>
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              AiLean by ProCann Edu
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivateAiLean;
