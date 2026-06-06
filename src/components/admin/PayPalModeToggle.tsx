import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export const PayPalModeToggle = () => {
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showProductionWarning, setShowProductionWarning] = useState(false);

  useEffect(() => {
    fetchCurrentMode();
  }, []);

  const fetchCurrentMode = async () => {
    try {
      setLoading(true);
      
      // Fetch from database configuration
      const { data: config, error: configError } = await supabase
        .from('paypal_configuration')
        .select('environment')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (config?.environment) {
        setEnvironment(config.environment as 'sandbox' | 'production');
      } else {
        // Diagnostic retired: leave environment unset rather than calling deleted edge function.
      }
    } catch (error) {
      console.error('Error fetching PayPal mode:', error);
      toast.error('Failed to fetch PayPal mode');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    toast.info('PayPal self-test retired', {
      description: 'Check Supabase Edge Function logs for paypal-webhook and create-dispensary-payment-paypal.',
    });
  };

  const handleToggleRequest = (checked: boolean) => {
    const newMode = checked ? 'production' : 'sandbox';
    
    if (newMode === 'production') {
      setShowProductionWarning(true);
    } else {
      updateEnvironment(newMode);
    }
  };

  const updateEnvironment = async (newEnvironment: 'sandbox' | 'production') => {
    setUpdating(true);
    setShowProductionWarning(false);
    
    try {
      toast.info(`Switching to ${newEnvironment} mode...`);

      const { data, error } = await supabase.functions.invoke('update-paypal-environment', {
        body: { environment: newEnvironment },
      });

      if (error) throw error;

      if (data?.success) {
        setEnvironment(newEnvironment);
        toast.success(`PayPal ${newEnvironment} mode activated`, {
          description: `All payments now use ${newEnvironment === 'production' ? 'live' : 'test'} credentials`,
        });
      } else {
        throw new Error(data?.error || 'Failed to update environment');
      }
    } catch (error: any) {
      console.error('Error toggling PayPal mode:', error);
      toast.error('Failed to change PayPal mode', {
        description: error.message,
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProduction = environment === 'production';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            PayPal Payment Mode
          </CardTitle>
          <CardDescription>
            Switch between sandbox and production payment processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Mode Badge */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {isProduction ? (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-600" />
              )}
              <div>
                <div className="font-semibold text-lg">
                  {isProduction ? 'Production Mode' : 'Sandbox Mode'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isProduction 
                    ? 'Processing real payments with live credentials'
                    : 'Testing with sandbox credentials - no real charges'
                  }
                </div>
              </div>
            </div>
            <Badge 
              variant={isProduction ? 'destructive' : 'default'}
              className="text-lg px-4 py-2"
            >
              {isProduction ? 'LIVE' : 'TEST'}
            </Badge>
          </div>

          {/* Warning Alert */}
          {isProduction && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Production Mode Active</AlertTitle>
              <AlertDescription>
                All payments are being processed with real money. Only use production mode
                when you're ready to accept live payments from customers.
              </AlertDescription>
            </Alert>
          )}

          {!isProduction && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Sandbox Mode Active</AlertTitle>
              <AlertDescription>
                You're safely testing with PayPal sandbox. No real charges will occur.
                Use this mode for development and testing.
              </AlertDescription>
            </Alert>
          )}

          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="paypal-mode" className="text-base font-medium">
                Enable Production Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Switch to live PayPal credentials for real transactions
              </p>
            </div>
            <Switch
              id="paypal-mode"
              checked={isProduction}
              onCheckedChange={handleToggleRequest}
              disabled={updating || loading}
            />
          </div>

          {/* Additional Info */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Sandbox Mode:</strong> Uses PayPal sandbox API credentials. Perfect for testing the entire payment flow without real money.</p>
            <p><strong>Production Mode:</strong> Uses live PayPal API credentials. Real charges will be processed.</p>
            <p><strong>Test Organizations:</strong> Always use sandbox mode regardless of global setting.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={testConnection}
              disabled={loading || updating || testing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={fetchCurrentMode}
              disabled={loading || updating || testing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Production Mode Warning Dialog */}
      <AlertDialog open={showProductionWarning} onOpenChange={setShowProductionWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Enable Production Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">⚠️ WARNING: This will enable LIVE payment processing</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All future payments will charge real money</li>
                <li>PayPal production credentials will be used</li>
                <li>Test organizations will still use sandbox mode</li>
                <li>All admins will be notified of this change</li>
              </ul>
              <p className="text-sm font-medium mt-4">
                Only proceed if you have configured production PayPal credentials and are ready for live payments.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateEnvironment('production')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Enable Production Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
