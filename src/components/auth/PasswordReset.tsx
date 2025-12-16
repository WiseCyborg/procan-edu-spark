import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, CheckCircle, AlertTriangle, Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';

type TokenError = 'expired' | 'used' | 'invalid' | 'missing' | null;

export const PasswordReset: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<TokenError>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const resetToken = urlParams.get('token');
    
    console.log('[PasswordReset] Validating token...', { mode, hasToken: !!resetToken });
    
    if (mode !== 'reset' || !resetToken) {
      setTokenError('missing');
      setValidating(false);
      return;
    }

    setToken(resetToken);
    setValidating(true);

    try {
      console.log('[PasswordReset] Calling validate-password-reset-token...');
      const { data, error } = await invokePublicFunction('validate-password-reset-token', {
        token: resetToken
      });
      console.log('[PasswordReset] Validation response:', { data, error });

      if (error || !data?.is_valid) {
        // Determine specific error type
        const errorMsg = data?.error_message?.toLowerCase() || '';
        if (errorMsg.includes('expired')) {
          setTokenError('expired');
        } else if (errorMsg.includes('used') || errorMsg.includes('already')) {
          setTokenError('used');
        } else {
          setTokenError('invalid');
        }
        setTokenValid(false);
        return;
      }

      setEmail(data.email);
      setTokenValid(true);
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenError('invalid');
      setTokenValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PasswordReset] Starting password reset...');
    
    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[PasswordReset] Calling execute-password-reset...');
      const { data, error } = await invokePublicFunction('execute-password-reset', {
        token,
        new_password: password
      });
      console.log('[PasswordReset] Reset response:', { data, error });

      if (error || !data?.success) {
        console.error('Password update error:', error, data);
        
        // Check for pwned/breached password error
        if (data?.code === 'pwned_password') {
          toast({
            title: "Password Found in Data Breach",
            description: "This password has been exposed in a known data breach. Please choose a unique password that you haven't used elsewhere.",
            variant: "destructive"
          });
          return;
        }
        
        throw new Error(data?.error || error?.message || 'Failed to update password');
      }

      setSuccess(true);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated",
      });

    } catch (error) {
      console.error('Password update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get error-specific messaging
  const getErrorContent = () => {
    switch (tokenError) {
      case 'expired':
        return {
          title: 'Link Expired',
          message: 'This password reset link has expired. Reset links are valid for 24 hours.',
          icon: <AlertTriangle className="h-12 w-12 text-amber-500" />,
          alertClass: 'border-amber-200 bg-amber-50',
          textClass: 'text-amber-800'
        };
      case 'used':
        return {
          title: 'Link Already Used',
          message: 'This password reset link has already been used. Each link can only be used once.',
          icon: <AlertTriangle className="h-12 w-12 text-amber-500" />,
          alertClass: 'border-amber-200 bg-amber-50',
          textClass: 'text-amber-800'
        };
      case 'missing':
        return {
          title: 'Invalid Request',
          message: 'No password reset token found. Please request a new password reset link.',
          icon: <AlertTriangle className="h-12 w-12 text-destructive" />,
          alertClass: 'border-destructive/20 bg-destructive/5',
          textClass: 'text-destructive'
        };
      default:
        return {
          title: 'Invalid Reset Link',
          message: 'This password reset link is invalid. Please request a new one.',
          icon: <AlertTriangle className="h-12 w-12 text-destructive" />,
          alertClass: 'border-destructive/20 bg-destructive/5',
          textClass: 'text-destructive'
        };
    }
  };

  if (validating) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating reset token...</p>
        </CardContent>
      </Card>
    );
  }

  if (!tokenValid) {
    const errorContent = getErrorContent();
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {errorContent.icon}
          </div>
          <CardTitle>{errorContent.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={errorContent.alertClass}>
            <AlertDescription className={errorContent.textClass}>
              {errorContent.message}
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Link to="/forgot-password">
              <Button className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Request New Reset Link
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle>Password Updated!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your password has been successfully updated.
            </AlertDescription>
          </Alert>
          
          <Link to="/auth">
            <Button className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue to Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Set New Password</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter your new password below
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            {password && <PasswordStrengthIndicator password={password} showRequirements />}
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            
            {/* Real-time password match indicator */}
            {confirmPassword && (
              <div className={`flex items-center gap-2 text-sm ${
                password === confirmPassword ? 'text-green-600' : 'text-destructive'
              }`}>
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Passwords match</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>Passwords don't match</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || !password || !confirmPassword || password !== confirmPassword}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};