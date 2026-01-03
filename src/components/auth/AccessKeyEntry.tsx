import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';

interface LookupAccessKeyResponse {
  success: boolean;
  token?: string;
  organization_name?: string;
  contact_email?: string;
  error?: string;
  message?: string;
}

/**
 * Access Key Entry Component
 * 
 * Handles organization access keys (format: DISP-YYYY-XXXXXXXX)
 * which are different from join codes (8-char codes from rvt_join_codes).
 * 
 * Flow:
 * 1. User enters access key from their employer
 * 2. Validates against organizations.unique_access_key via lookup-access-key
 * 3. If valid, redirects to manager registration with token
 * 4. If already registered, prompts to sign in
 */
export const AccessKeyEntry: React.FC = () => {
  const navigate = useNavigate();
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAccessKey = (value: string): string => {
    // Auto-format as user types: DISP-YYYY-XXXXXXXX
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return cleaned;
  };

  const handleContinue = async () => {
    const trimmedKey = accessKey.trim();
    
    if (!trimmedKey) {
      toast.error('Please enter your access key');
      return;
    }

    // Basic format validation
    if (!trimmedKey.startsWith('DISP-') || trimmedKey.length < 12) {
      setError('Access key should be in format: DISP-YYYY-XXXXXXXX');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await invokePublicFunction<LookupAccessKeyResponse>(
        'lookup-access-key',
        { access_key: trimmedKey }
      );

      if (apiError) {
        throw new Error(apiError.message || 'Failed to validate access key');
      }

      if (!data?.success) {
        // Handle specific error cases
        if (data?.error === 'ALREADY_REGISTERED') {
          toast.info('Organization already registered', {
            description: 'Please sign in with your account credentials.',
            action: {
              label: 'Sign In',
              onClick: () => navigate('/auth')
            }
          });
          setError('This organization has already completed registration. Please sign in instead.');
          return;
        }
        
        setError(data?.error || data?.message || 'Invalid access key');
        return;
      }

      // Success! Redirect to manager registration with token
      toast.success(`Welcome, ${data.organization_name}!`, {
        description: 'Redirecting to complete your registration...'
      });

      // Navigate to manager registration with the token
      navigate(`/register/manager?token=${data.token}`);

    } catch (err: any) {
      console.error('Access key lookup error:', err);
      setError(err.message || 'Unable to validate access key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleContinue();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="accessKey">Organization Access Key</Label>
        <Input
          id="accessKey"
          value={accessKey}
          onChange={(e) => {
            setAccessKey(formatAccessKey(e.target.value));
            setError(null);
          }}
          onKeyPress={handleKeyPress}
          placeholder="DISP-YYYY-XXXXXXXX"
          className="uppercase mt-1 font-mono"
          maxLength={24}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          This key is provided by your dispensary after they purchase training licenses
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      
      <Button 
        onClick={handleContinue}
        className="w-full"
        disabled={loading || accessKey.length < 12}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validating...
          </>
        ) : (
          <>
            Continue to Registration
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <button 
            type="button"
            onClick={() => navigate('/auth')}
            className="text-primary hover:underline"
          >
            Sign in here
          </button>
        </p>
        <p className="text-xs text-muted-foreground">
          Have a join code instead?{' '}
          <button 
            type="button"
            onClick={() => navigate('/auth?role=student&tab=code')}
            className="text-primary hover:underline"
          >
            Use join code
          </button>
        </p>
      </div>
    </div>
  );
};

export default AccessKeyEntry;
