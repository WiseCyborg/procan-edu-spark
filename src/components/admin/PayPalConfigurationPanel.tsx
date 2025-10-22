import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PayPalConfigPanelProps {
  onStatusChange?: (status: 'connected' | 'error' | 'testing') => void;
}

export const PayPalConfigurationPanel = ({ onStatusChange }: PayPalConfigPanelProps) => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [environment, setEnvironment] = useState<string>('');
  const [clientIdMasked, setClientIdMasked] = useState<string>('');
  const [secretMasked, setSecretMasked] = useState<string>('');
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const { toast } = useToast();

  const testConnection = async () => {
    setTestLoading(true);
    setStatus('testing');
    setErrorDetails(null);
    
    if (onStatusChange) onStatusChange('testing');

    try {
      const { data, error } = await supabase.functions.invoke('test-paypal-connection');
      
      if (error) throw error;

      if (data?.success) {
        setStatus('connected');
        setEnvironment(data.details.environment);
        
        // Create masked credentials
        const clientIdFirst = data.details.clientIdFirst4 || '';
        const clientIdLast = data.details.clientIdLast4 || '';
        const maskedId = `${clientIdFirst}${'•'.repeat(32)}${clientIdLast}`;
        setClientIdMasked(maskedId);
        
        // Mask secret similarly (we don't get secret back, so use placeholder)
        setSecretMasked(`${'•'.repeat(40)}`);
        
        setLastTestTime(new Date());
        
        if (onStatusChange) onStatusChange('connected');
        
        toast({
          title: "✅ PayPal Connected",
          description: `Successfully connected to PayPal ${data.details.environment}`,
        });
      } else {
        throw new Error(data?.message || 'Connection failed');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorDetails(err);
      
      if (onStatusChange) onStatusChange('error');
      
      toast({
        title: "❌ Connection Failed",
        description: err.message || "Unable to connect to PayPal",
        variant: "destructive"
      });
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'testing':
        return (
          <Badge variant="secondary">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            Testing...
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Unknown
          </Badge>
        );
    }
  };

  const formatTimestamp = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              💳 PayPal Configuration
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Monitor PayPal integration status and credentials
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Environment</label>
          <div className="flex items-center gap-2">
            <Badge 
              variant={environment === 'production' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {environment === 'production' ? '🟢 Production' : '🔵 Sandbox'}
            </Badge>
          </div>
        </div>

        {/* Masked Credentials */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Client ID</label>
            <div className="font-mono text-sm bg-muted text-muted-foreground p-3 rounded-md border border-border">
              {clientIdMasked || 'Not loaded'}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Client Secret</label>
            <div className="font-mono text-sm bg-muted text-muted-foreground p-3 rounded-md border border-border">
              {secretMasked || 'Not loaded'}
            </div>
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Status</span>
            {getStatusBadge()}
          </div>
          <div className="text-sm text-muted-foreground">
            Last Test: {formatTimestamp(lastTestTime)}
          </div>
        </div>

        {/* Error Details */}
        {status === 'error' && errorDetails && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Error:</strong> {errorDetails.message || 'Unknown error'}
              {errorDetails.details && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(errorDetails.details, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={testConnection} 
            disabled={testLoading}
            variant="default"
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${testLoading ? 'animate-spin' : ''}`} />
            {testLoading ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        {/* Info Note */}
        <Alert>
          <AlertDescription className="text-xs text-muted-foreground">
            ℹ️ Credentials are stored securely in Supabase secrets. Only admins can test connection.
            To update credentials, use Supabase dashboard.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
