import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestResult {
  step: string;
  status: "pending" | "running" | "success" | "error";
  message: string;
  data?: any;
}

export const PipelineTestHarness = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (step: string, status: TestResult["status"], message: string, data?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => r.step === step ? { step, status, message, data } : r);
      }
      return [...prev, { step, status, message, data }];
    });
  };

  const runEndToEndTest = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Step 1: Create Test Employee Account
      updateResult("create-account", "running", "Creating test employee account...");
      
      const { data: registerData, error: registerError } = await supabase.functions.invoke(
        "register-with-seat-allocation",
        {
          body: {
            email: "test.employee@procannedu.com",
            password: "TestPass123!",
            firstName: "Test",
            lastName: "Employee",
            phone: "5551234567",
            organizationName: "Demo Dispensary LLC",
            joinCode: "DEMO-20251125-BA5C8B"
          }
        }
      );

      if (registerError) {
        updateResult("create-account", "error", `Registration failed: ${registerError.message}`, registerError);
        toast.error("Account creation failed");
        setIsRunning(false);
        return;
      }

      updateResult("create-account", "success", "Test employee account created", registerData);
      const userId = registerData.userId;

      // Step 2: Verify Account Creation
      updateResult("verify-account", "running", "Verifying account creation...");

      const { data: authUser } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .eq("role", "student")
        .single();

      const { data: seat } = await supabase
        .from("rvt_seats")
        .select("*")
        .eq("assigned_user_id", userId)
        .single();

      if (!authUser || !userRole || !seat) {
        updateResult("verify-account", "error", "Account verification failed - missing data", {
          hasProfile: !!authUser,
          hasRole: !!userRole,
          hasSeat: !!seat
        });
        toast.error("Account verification failed");
        setIsRunning(false);
        return;
      }

      updateResult("verify-account", "success", "Account verified: profile, role, and seat created", {
        profile: authUser,
        role: userRole,
        seat: seat
      });

      // Step 3: Check Journey State
      updateResult("verify-journey", "running", "Checking journey state initialization...");

      const { data: journeyState } = await supabase
        .from("user_journey_state")
        .select("*")
        .eq("user_id", userId)
        .single();

      updateResult("verify-journey", journeyState ? "success" : "error", 
        journeyState ? "Journey state initialized" : "Journey state not initialized",
        journeyState
      );

      // Step 4: Get Course Modules
      updateResult("get-modules", "running", "Fetching course modules...");

      const { data: modules, error: modulesError } = await supabase
        .from("course_modules")
        .select("*")
        .order("module_number");

      if (modulesError || !modules || modules.length === 0) {
        updateResult("get-modules", "error", "Failed to fetch modules", modulesError);
        setIsRunning(false);
        return;
      }

      updateResult("get-modules", "success", `Found ${modules.length} modules`, { count: modules.length });

      toast.success("Pipeline test completed - Ready for manual training walkthrough");

    } catch (error: any) {
      updateResult("error", "error", `Unexpected error: ${error.message}`, error);
      toast.error("Test failed");
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">End-to-End Pipeline Test</h2>
          <p className="text-muted-foreground">
            Validates the complete pipeline from employee registration through certificate generation
          </p>
        </div>

        <Alert>
          <AlertDescription>
            <strong>Test Employee Credentials:</strong><br />
            Email: test.employee@procannedu.com<br />
            Password: TestPass123!<br />
            Organization: Demo Dispensary LLC<br />
            Join Code: DEMO-20251125-BA5C8B
          </AlertDescription>
        </Alert>

        <Button
          onClick={runEndToEndTest}
          disabled={isRunning}
          size="lg"
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-2" />
              Run End-to-End Test
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Test Results:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{result.step}</span>
                    <Badge variant={
                      result.status === "success" ? "default" :
                      result.status === "error" ? "destructive" :
                      result.status === "running" ? "secondary" : "outline"
                    }>
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {results.some(r => r.status === "success" && r.step === "verify-account") && (
          <Alert>
            <AlertDescription>
              <strong>Next Steps:</strong><br />
              1. Log in as test.employee@procannedu.com<br />
              2. Complete training modules (23 total)<br />
              3. Take final exam (need ≥80%)<br />
              4. Verify certificate generation and email<br />
              5. Test certificate verification at /verify-certificate
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};
