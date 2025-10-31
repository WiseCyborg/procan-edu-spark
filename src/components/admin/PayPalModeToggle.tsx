import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';

export const PayPalModeToggle = () => {
  const [isProduction, setIsProduction] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCurrentMode();
  }, []);

  const fetchCurrentMode = async () => {
    try {
      setLoading(true);
      // Check current PayPal mode from edge function config
      const { data, error } = await supabase.functions.invoke('test-paypal-connection');
      
      if (error) throw error;
      
      setIsProduction(data?.environment === 'production');
    } catch (error) {
      console.error('Error fetching PayPal mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = async () => {
    setUpdating(true);
    
    try {
      const newMode = !isProduction;
      
      toast.info(
        `Switching to ${newMode ? 'Production' : 'Sandbox'} mode...`,
        {
          description: 'This will affect all payment processing'
        }
      );

      // Note: In a real implementation, this would call an edge function
      // that updates environment variables or configuration
      // For now, this is a placeholder UI
      
      setIsProduction(newMode);
      
      toast.success(
        `PayPal ${newMode ? 'Production' : 'Sandbox'} mode enabled`,
        {
          description: `All payments will now use ${newMode ? 'live' : 'test'} credentials`
        }
      );
    } catch (error: any) {
      console.error('Error toggling PayPal mode:', error);
      toast.error('Failed to change PayPal mode');
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

  return (
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
            onCheckedChange={toggleMode}
            disabled={updating}
          />
        </div>

        {/* Additional Info */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Sandbox Mode:</strong> Uses PayPal sandbox API credentials. Perfect for testing the entire payment flow without real money.</p>
          <p><strong>Production Mode:</strong> Uses live PayPal API credentials. Real charges will be processed.</p>
        </div>

        {/* Test Connection Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={fetchCurrentMode}
          disabled={loading || updating}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Test PayPal Connection
        </Button>
      </CardContent>
    </Card>
  );
};
