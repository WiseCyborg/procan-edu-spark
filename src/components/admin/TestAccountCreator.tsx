import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleBadge } from '@/components/ui/role-badge';
import { Building2, Plus, Trash2, Copy, Loader2, Rocket, CheckCircle } from 'lucide-react';
import { UserRole } from '@/hooks/useUserRole';
import { SecureAdminUserService } from '@/services/SecureAdminUserService';

interface TestAccountConfig {
  role: UserRole;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface CreatedAccount {
  userId: string;
  email: string;
  password: string;
  role: UserRole;
  organizationName?: string;
}

const TestAccountCreator = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState<CreatedAccount[]>([]);
  const [testOrgInfo, setTestOrgInfo] = useState<{ id: string; name: string; accessKey: string } | null>(null);

  // Individual account creation form states
  const [adminEmail, setAdminEmail] = useState('admin@procannedu-test.com');
  const [managerEmail, setManagerEmail] = useState('manager@testdispensary.com');
  const [coordinatorEmail, setCoordinatorEmail] = useState('coordinator@testdispensary.com');
  const [employeeEmail, setEmployeeEmail] = useState('employee1@testdispensary.com');

  const createTestAccount = async (config: TestAccountConfig): Promise<{ success: boolean; userId?: string; message?: string }> => {
    try {
      // 1. Create auth user via SECURE edge function (not client-side admin API)
      const result = await SecureAdminUserService.createUser({
        email: config.email,
        password: config.password,
        metadata: {
          first_name: config.firstName,
          last_name: config.lastName,
          organization_id: config.organizationId
        },
        organizationId: config.organizationId,
        role: config.role,
      });

      if (!result.success) {
        console.error('Auth error:', result.error);
        return { success: false, message: result.error };
      }

      const userId = result.data?.userId;
      if (!userId) {
        return { success: false, message: 'Failed to create user' };
      }

      // Note: Profile, role, and metadata are now created by the edge function
      // The SecureAdminUserService.createUser handles organizationId and role assignment
      
      // 2. Add test metadata (optional, non-critical)
      const { error: metadataError } = await supabase.from('user_metadata').insert({
        user_id: userId,
        department: config.role === 'admin' ? 'Administration' : 'Operations',
        employee_id: `TEST-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        tags: ['test_account', 'auto_generated']
      });

      if (metadataError) {
        console.warn('Metadata error (non-critical):', metadataError);
      }

      return { success: true, userId };
    } catch (error) {
      console.error('Error creating test account:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const [creationProgress, setCreationProgress] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const createFullTestSuite = async (retry = false) => {
    setIsCreating(true);
    setLastError(null);
    if (!retry) {
      setCreatedAccounts([]);
      setTestOrgInfo(null);
    }

    try {
      console.log('[TestAccountCreator] Starting full test suite creation...');
      setCreationProgress('Initializing demo environment...');
      
      toast({
        title: "Creating Demo Accounts",
        description: "Setting up complete demo environment...",
      });

      console.log('[TestAccountCreator] Invoking create-demo-accounts edge function...');
      const { data, error } = await supabase.functions.invoke('create-demo-accounts');

      console.log('[TestAccountCreator] Edge function response:', { data, error });

      if (error) {
        const errorMsg = error.message || "Could not reach demo account creation service";
        console.error('[TestAccountCreator] Edge function invocation error:', error);
        setLastError(errorMsg);
        toast({
          title: "Function Error",
          description: `${errorMsg}. Check console for details.`,
          variant: "destructive"
        });
        setIsCreating(false);
        setCreationProgress(null);
        return;
      }

      if (!data) {
        const errorMsg = "The demo account service didn't return any data";
        console.error('[TestAccountCreator] No data returned from edge function');
        setLastError(errorMsg);
        toast({
          title: "No Response",
          description: errorMsg,
          variant: "destructive"
        });
        setIsCreating(false);
        setCreationProgress(null);
        return;
      }

      if (!data.success) {
        const errorMsg = data.error || data.message || 'Failed to create demo accounts';
        console.error('[TestAccountCreator] Demo creation failed:', data);
        setLastError(errorMsg);
        toast({
          title: "Creation Failed",
          description: errorMsg,
          variant: "destructive"
        });
        setIsCreating(false);
        setCreationProgress(null);
        return;
      }

      // Success path
      console.log('[TestAccountCreator] Success! Created accounts:', data.accounts);
      setCreatedAccounts(data.accounts);
      setTestOrgInfo(data.organization);
      setCreationProgress(null);

      toast({
        title: "✅ Demo Accounts Created!",
        description: `Created ${data.accounts.length} accounts successfully`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[TestAccountCreator] Error creating test suite:', error);
      setLastError(errorMsg);
      toast({
        title: "Error",
        description: `Failed to create test suite: ${errorMsg}`,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
      setCreationProgress(null);
    }
  };

  const createIndividualAccount = async (role: UserRole, email: string) => {
    setIsCreating(true);
    try {
      const config: TestAccountConfig = {
        role,
        email,
        password: `${role.charAt(0).toUpperCase() + role.slice(1)}123!Test`,
        firstName: role.charAt(0).toUpperCase() + role.slice(1),
        lastName: 'Tester',
        organizationId: role !== 'admin' && testOrgInfo ? testOrgInfo.id : undefined
      };

      const result = await createTestAccount(config);

      if (result.success && result.userId) {
        const newAccount: CreatedAccount = {
          userId: result.userId,
          email: config.email,
          password: config.password,
          role: config.role,
          organizationName: config.organizationId ? testOrgInfo?.name : undefined
        };

        setCreatedAccounts([...createdAccounts, newAccount]);

        toast({
          title: "Account Created",
          description: `Created ${role} test account: ${email}`,
        });
      } else {
        throw new Error(result.message || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const clearAllTestAccounts = async () => {
    if (!confirm('Are you sure you want to delete all test accounts? This cannot be undone.')) {
      return;
    }

    setIsCreating(true);
    try {
      // Delete all accounts via secure edge function
      for (const account of createdAccounts) {
        await SecureAdminUserService.deleteUser(account.userId);
      }

      // Delete test organization if exists
      if (testOrgInfo) {
        await supabase.from('organizations').delete().eq('id', testOrgInfo.id);
      }

      setCreatedAccounts([]);
      setTestOrgInfo(null);

      toast({
        title: "Test Accounts Cleared",
        description: "All test accounts have been deleted",
      });
    } catch (error) {
      console.error('Error clearing test accounts:', error);
      toast({
        title: "Error",
        description: "Failed to clear test accounts",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-primary">
            <Rocket className="h-5 w-5 mr-2" />
            Test Account Generator
          </CardTitle>
          <CardDescription>
            Create test accounts at all role levels for development and testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress indicator */}
          {creationProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">{creationProgress}</span>
            </div>
          )}

          {/* Error with retry */}
          {lastError && !isCreating && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-sm text-destructive font-medium">Error: {lastError}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => createFullTestSuite(true)}
              >
                <Loader2 className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={() => createFullTestSuite()} 
              disabled={isCreating}
              className="w-full"
              size="lg"
            >
              {isCreating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><Rocket className="h-4 w-4 mr-2" /> Create Full Test Suite</>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={clearAllTestAccounts}
              disabled={isCreating || createdAccounts.length === 0}
              className="w-full"
              size="lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Test Accounts
            </Button>
          </div>

          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Full Test Suite includes:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>1 Admin account (no org)</li>
              <li>1 Dispensary Manager (linked to test org)</li>
              <li>1 Training Coordinator (linked to test org)</li>
              <li>3 Employee accounts (linked to test org)</li>
              <li>1 Test Organization with 50 credits</li>
            </ul>
          </div>

          {/* Individual Account Creation */}
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="manager">Manager</TabsTrigger>
              <TabsTrigger value="coordinator">Coordinator</TabsTrigger>
              <TabsTrigger value="employee">Employee</TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@procannedu-test.com"
                />
              </div>
              <Button 
                onClick={() => createIndividualAccount('admin', adminEmail)}
                disabled={isCreating || !adminEmail}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Admin Account
              </Button>
            </TabsContent>

            <TabsContent value="manager" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manager-email">Manager Email</Label>
                <Input
                  id="manager-email"
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="manager@testdispensary.com"
                />
              </div>
              {!testOrgInfo && (
                <p className="text-sm text-amber-600">
                  ⚠️ Create a test organization first (use Full Test Suite)
                </p>
              )}
              <Button 
                onClick={() => createIndividualAccount('dispensary_manager', managerEmail)}
                disabled={isCreating || !managerEmail || !testOrgInfo}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Manager Account
              </Button>
            </TabsContent>

            <TabsContent value="coordinator" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coordinator-email">Coordinator Email</Label>
                <Input
                  id="coordinator-email"
                  type="email"
                  value={coordinatorEmail}
                  onChange={(e) => setCoordinatorEmail(e.target.value)}
                  placeholder="coordinator@testdispensary.com"
                />
              </div>
              {!testOrgInfo && (
                <p className="text-sm text-amber-600">
                  ⚠️ Create a test organization first (use Full Test Suite)
                </p>
              )}
              <Button 
                onClick={() => createIndividualAccount('training_coordinator', coordinatorEmail)}
                disabled={isCreating || !coordinatorEmail || !testOrgInfo}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Coordinator Account
              </Button>
            </TabsContent>

            <TabsContent value="employee" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee-email">Employee Email</Label>
                <Input
                  id="employee-email"
                  type="email"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  placeholder="employee1@testdispensary.com"
                />
              </div>
              {!testOrgInfo && (
                <p className="text-sm text-amber-600">
                  ⚠️ Create a test organization first (use Full Test Suite)
                </p>
              )}
              <Button 
                onClick={() => createIndividualAccount('student', employeeEmail)}
                disabled={isCreating || !employeeEmail || !testOrgInfo}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Employee Account
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Test Organization Info */}
      {testOrgInfo && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-green-700">
              <Building2 className="h-5 w-5 mr-2" />
              Test Organization Created
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Organization:</span>
              <span className="text-sm">{testOrgInfo.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Access Key:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white px-2 py-1 rounded">{testOrgInfo.accessKey}</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(testOrgInfo.accessKey)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="border-t border-green-200 mt-4 pt-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-700">50</div>
                  <div className="text-xs text-green-600">Credits Available</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-700">
                    {createdAccounts.filter(a => a.organizationName).length}
                  </div>
                  <div className="text-xs text-amber-600">Credits Used</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {50 - createdAccounts.filter(a => a.organizationName).length}
                  </div>
                  <div className="text-xs text-blue-600">Credits Remaining</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created Accounts List */}
      {createdAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Created Test Accounts ({createdAccounts.length})
            </CardTitle>
            <CardDescription>
              Copy credentials below to test login flows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {createdAccounts.map((account) => (
                    <TableRow key={account.userId}>
                      <TableCell>
                        <RoleBadge role={account.role} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{account.email}</code>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => copyToClipboard(account.email)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{account.password}</code>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => copyToClipboard(account.password)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {account.organizationName || 'None'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open('/auth', '_blank')}
                        >
                          Login
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestAccountCreator;
