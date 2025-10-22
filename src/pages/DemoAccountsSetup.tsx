import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import TestAccountCreator from '@/components/admin/TestAccountCreator';
import { TestEmailSender } from '@/components/admin/TestEmailSender';
import { Loader2, ShieldAlert, Rocket } from 'lucide-react';

const DemoAccountsSetup = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !rolesLoading && !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, rolesLoading, isAdmin, navigate]);

  if (loading || rolesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-bold">Admin Access Required</h2>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Demo Setup</h1>
        </div>
        <p className="text-muted-foreground">
          Create demo accounts for testing and demonstrations
        </p>
      </div>

      <div className="space-y-6">
        <Tabs defaultValue="checklist" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="checklist">Pre-Demo Checklist</TabsTrigger>
            <TabsTrigger value="accounts">Create Demo Accounts</TabsTrigger>
            <TabsTrigger value="email-test">Test Email System</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Important Pre-Demo Checklist
                </CardTitle>
                <CardDescription>
                  Verify these items before creating demo accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Database triggers are attached (verified in Phase 1)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    RLS policies are non-recursive (fixed in Phase 1)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    PayPal connection verified (sandbox mode)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    Email service - Testing required (RESEND_API_KEY added)
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What Happens When You Create Demo Accounts?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">✅ Automatically Created:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Auth users in Supabase Auth</li>
                      <li>User profiles (via trigger)</li>
                      <li>Role assignments (via trigger)</li>
                      <li>Test organization with 50 credits</li>
                      <li>Organization linking for non-admin users</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">📋 Demo Accounts Include:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>1 Admin (admin@procannedu.com)</li>
                      <li>1 Dispensary Manager</li>
                      <li>1 Training Coordinator</li>
                      <li>1 Employee/Student</li>
                      <li>All linked to "Demo Dispensary LLC"</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">🧪 Test Registration Flow:</h4>
                  <p className="text-sm text-muted-foreground">
                    After creating demo accounts, test the registration flow by:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground mt-2">
                    <li>Opening an incognito browser window</li>
                    <li>Going to /auth?role=student</li>
                    <li>Registering a new test employee with the org access key</li>
                    <li>Verifying profile auto-creation and role assignment</li>
                    <li>Checking the user appears in the admin dashboard</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <TestAccountCreator />
          </TabsContent>

          <TabsContent value="email-test" className="space-y-4">
            <TestEmailSender />
          </TabsContent>
        </Tabs>

        <div className="flex gap-4 mt-6">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Back to Admin Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/user-management')}>
            View All Users
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DemoAccountsSetup;
