import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, Key } from "lucide-react";

interface PayPalSecrets {
  sandboxClientId: boolean;
  sandboxClientSecret: boolean;
  productionClientId: boolean;
  productionClientSecret: boolean;
  legacyClientId: boolean;
  legacyClientSecret: boolean;
}

interface SecretsStatus {
  secrets: PayPalSecrets;
  sandboxReady: boolean;
  productionReady: boolean;
  hasLegacy: boolean;
  recommendations: {
    canUseSandbox: boolean;
    canUseProduction: boolean;
    shouldMigrate: boolean;
  };
}

export function PayPalManagementPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connected" | "error" | "testing">("idle");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
  const [showProductionWarning, setShowProductionWarning] = useState(false);
  const [secretsStatus, setSecretsStatus] = useState<SecretsStatus | null>(null);

  useEffect(() => {
    fetchCurrentState();
  }, []);

  const fetchCurrentState = async () => {
    setLoading(true);
    try {
      // Fetch current environment
      const { data: configData } = await supabase
        .from("paypal_configuration")
        .select("environment")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (configData?.environment) {
        setEnvironment(configData.environment as "sandbox" | "production");
      }

      // Check secrets status
      await checkSecrets();

      // Test connection
      await testConnection(false);
    } catch (error) {
      console.error("Error fetching PayPal state:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSecrets = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-paypal-secrets");
      
      if (error) throw error;
      
      setSecretsStatus(data);
    } catch (error) {
      console.error("Error checking secrets:", error);
    }
  };

  const testConnection = async (showToast = true) => {
    setTesting(true);
    setConnectionStatus("testing");
    
    try {
      setConnectionStatus("error");
      setErrorDetails("PayPal self-test diagnostic has been retired. Verify credentials via the Edge Function logs in Supabase.");
      if (showToast) {
        toast({
          title: "Diagnostic retired",
          description: "The PayPal self-test endpoint has been removed. Use Supabase Edge Function logs to verify connectivity.",
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleToggleRequest = (checked: boolean) => {
    const newEnv = checked ? "production" : "sandbox";
    
    if (newEnv === "production") {
      if (!secretsStatus?.productionReady && !secretsStatus?.hasLegacy) {
        toast({
          variant: "destructive",
          title: "Production credentials missing",
          description: "Configure production PayPal credentials before enabling production mode",
        });
        return;
      }
      setShowProductionWarning(true);
    } else {
      updateEnvironment(newEnv);
    }
  };

  const updateEnvironment = async (newEnv: "sandbox" | "production") => {
    setUpdating(true);
    try {
      const { error } = await supabase.functions.invoke("update-paypal-environment", {
        body: { environment: newEnv },
      });

      if (error) throw error;

      setEnvironment(newEnv);
      setShowProductionWarning(false);
      
      toast({
        title: "Environment updated",
        description: `PayPal switched to ${newEnv} mode`,
      });

      // Re-test connection with new environment
      await testConnection(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update environment",
        description: error.message,
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Connected</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Error</Badge>;
      case "testing":
        return <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Testing...</Badge>;
      default:
        return <Badge variant="outline">Not tested</Badge>;
    }
  };

  const getEnvironmentBadge = () => {
    if (environment === "production") {
      return <Badge className="bg-red-500">🔴 PRODUCTION</Badge>;
    }
    return <Badge className="bg-blue-500">🔵 SANDBOX</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading PayPal configuration...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              PayPal Integration
              {getEnvironmentBadge()}
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage PayPal credentials and environment settings
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Secrets Status */}
        {secretsStatus && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              Credentials Status
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Sandbox Credentials</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    {secretsStatus.secrets.sandboxClientId ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Client ID</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {secretsStatus.secrets.sandboxClientSecret ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Client Secret</span>
                  </div>
                </div>
                {secretsStatus.sandboxReady && (
                  <Badge variant="outline" className="bg-green-50">Ready</Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Production Credentials</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    {secretsStatus.secrets.productionClientId ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Client ID</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {secretsStatus.secrets.productionClientSecret ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Client Secret</span>
                  </div>
                </div>
                {secretsStatus.productionReady ? (
                  <Badge variant="outline" className="bg-green-50">Ready</Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50">Not configured</Badge>
                )}
              </div>
            </div>

            {secretsStatus.hasLegacy && secretsStatus.recommendations.shouldMigrate && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Legacy credentials detected. Consider adding environment-specific credentials for better control.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Environment Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="environment-toggle" className="text-base font-medium">
              Production Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              {environment === "production" 
                ? "⚠️ Real payments will be processed" 
                : "Test mode - no real charges"}
            </p>
          </div>
          <Switch
            id="environment-toggle"
            checked={environment === "production"}
            onCheckedChange={handleToggleRequest}
            disabled={updating}
          />
        </div>

        {/* Error Display */}
        {connectionStatus === "error" && errorDetails && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Error:</strong> {errorDetails}
            </AlertDescription>
          </Alert>
        )}

        {/* Last Test Time */}
        {lastTestTime && (
          <p className="text-xs text-muted-foreground">
            Last tested: {lastTestTime.toLocaleString()}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => testConnection(true)}
            disabled={testing}
            variant="outline"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
          <Button
            onClick={fetchCurrentState}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc/settings/functions`, '_blank')}
          >
            Manage Secrets
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            PayPal credentials are stored securely in Supabase Secrets. Never commit credentials to your codebase.
          </AlertDescription>
        </Alert>
      </Card>

      {/* Production Warning Dialog */}
      <AlertDialog open={showProductionWarning} onOpenChange={setShowProductionWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Enable Production Mode?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to enable <strong>PRODUCTION</strong> mode for PayPal payments.</p>
              <p className="font-semibold text-red-600">Real charges will be processed!</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Real money will be charged to customers</li>
                <li>All payments will go to your live PayPal account</li>
                <li>Refunds require manual processing</li>
                <li>Make sure you've tested thoroughly in sandbox first</li>
              </ul>
              <p className="text-sm">Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel - Stay in Sandbox</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateEnvironment("production")}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Enable Production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
