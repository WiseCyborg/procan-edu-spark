import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Copy, Users, Key, Shield, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UATAccountConfig {
  accountType: 'admin' | 'manager' | 'coordinator' | 'employee';
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  notes: string;
}

const DEMO_ORG_ID = '18bfd997-06bb-454e-823d-4923845f640c';
const DEFAULT_PASSWORD = 'ProCann2024!';
const JOIN_CODE = 'UAT-DEMO-2024';

const UAT_ACCOUNTS: UATAccountConfig[] = [
  {
    accountType: 'admin',
    email: 'uat-admin@procannedu.com',
    firstName: 'UAT',
    lastName: 'Admin',
    organizationId: null,
    notes: 'Full system admin access for testing'
  },
  {
    accountType: 'manager',
    email: 'uat-manager@procannedu.com',
    firstName: 'UAT',
    lastName: 'Manager',
    organizationId: DEMO_ORG_ID,
    notes: 'Dispensary manager for Demo Dispensary LLC'
  },
  {
    accountType: 'coordinator',
    email: 'uat-coordinator@procannedu.com',
    firstName: 'UAT',
    lastName: 'Coordinator',
    organizationId: DEMO_ORG_ID,
    notes: 'Training coordinator for Demo Dispensary LLC'
  },
  {
    accountType: 'employee',
    email: 'uat-employee1@procannedu.com',
    firstName: 'UAT',
    lastName: 'Employee1',
    organizationId: DEMO_ORG_ID,
    notes: 'Test employee - full training flow'
  },
  {
    accountType: 'employee',
    email: 'uat-employee2@procannedu.com',
    firstName: 'UAT',
    lastName: 'Employee2',
    organizationId: DEMO_ORG_ID,
    notes: 'Test employee - edge cases'
  }
];

type AccountStatus = 'pending' | 'creating' | 'success' | 'error';

interface AccountState {
  status: AccountStatus;
  error?: string;
}

export const UATSetupPanel: React.FC = () => {
  const [accountStates, setAccountStates] = useState<Record<string, AccountState>>(
    Object.fromEntries(UAT_ACCOUNTS.map(a => [a.email, { status: 'pending' }]))
  );
  const [isCreatingAll, setIsCreatingAll] = useState(false);

  const createAccount = async (config: UATAccountConfig): Promise<boolean> => {
    setAccountStates(prev => ({
      ...prev,
      [config.email]: { status: 'creating' }
    }));

    try {
      const { data, error } = await supabase.functions.invoke('create-uat-account', {
        body: {
          accountType: config.accountType,
          email: config.email,
          password: DEFAULT_PASSWORD,
          firstName: config.firstName,
          lastName: config.lastName,
          organizationId: config.organizationId,
          notes: config.notes
        }
      });

      if (error) throw error;

      setAccountStates(prev => ({
        ...prev,
        [config.email]: { status: 'success' }
      }));
      return true;
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      setAccountStates(prev => ({
        ...prev,
        [config.email]: { status: 'error', error: errorMsg }
      }));
      return false;
    }
  };

  const createAllAccounts = async () => {
    setIsCreatingAll(true);
    let successCount = 0;

    for (const config of UAT_ACCOUNTS) {
      const success = await createAccount(config);
      if (success) successCount++;
      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsCreatingAll(false);
    toast.success(`Created ${successCount}/${UAT_ACCOUNTS.length} UAT accounts`);
  };

  const copyCredentials = (email: string) => {
    const text = `Email: ${email}\nPassword: ${DEFAULT_PASSWORD}`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard');
  };

  const copyAllCredentials = () => {
    const text = UAT_ACCOUNTS.map(a => 
      `${a.accountType.toUpperCase()}\nEmail: ${a.email}\nPassword: ${DEFAULT_PASSWORD}\n`
    ).join('\n---\n');
    navigator.clipboard.writeText(text);
    toast.success('All credentials copied to clipboard');
  };

  const getStatusIcon = (status: AccountStatus) => {
    switch (status) {
      case 'creating':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getRoleIcon = (accountType: string) => {
    switch (accountType) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'manager':
        return <Users className="h-4 w-4" />;
      case 'coordinator':
        return <UserCog className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (accountType: string) => {
    switch (accountType) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'coordinator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            UAT Test Accounts Setup
          </CardTitle>
          <CardDescription>
            Create 5 test accounts for UAT testing: Admin, Manager, Coordinator, and 2 Employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={createAllAccounts} 
              disabled={isCreatingAll}
              size="lg"
            >
              {isCreatingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Accounts...
                </>
              ) : (
                <>Create All 5 UAT Accounts</>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={copyAllCredentials}
              size="lg"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All Credentials
            </Button>
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Default Password for all accounts:</p>
            <code className="text-sm text-primary">{DEFAULT_PASSWORD}</code>
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">UAT Join Code for Employee Registration:</p>
            <code className="text-sm text-primary">{JOIN_CODE}</code>
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2"
              onClick={() => {
                navigator.clipboard.writeText(JOIN_CODE);
                toast.success('Join code copied');
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {UAT_ACCOUNTS.map((account) => {
          const state = accountStates[account.email];
          return (
            <Card key={account.email} className={state.status === 'success' ? 'border-green-500/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={getRoleBadgeVariant(account.accountType) as any}>
                    {getRoleIcon(account.accountType)}
                    <span className="ml-1 capitalize">{account.accountType}</span>
                  </Badge>
                  {getStatusIcon(state.status)}
                </div>
                <CardTitle className="text-base mt-2">{account.firstName} {account.lastName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-mono">{account.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{account.notes}</p>
                </div>

                {state.status === 'error' && (
                  <p className="text-xs text-destructive">{state.error}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => createAccount(account)}
                    disabled={state.status === 'creating' || isCreatingAll}
                  >
                    {state.status === 'creating' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : state.status === 'success' ? (
                      'Recreate'
                    ) : (
                      'Create'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCredentials(account.email)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Testing Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>UAT Testing Checklist</CardTitle>
          <CardDescription>
            Test each role through their complete user journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Admin (uat-admin@procannedu.com)</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Login and access admin dashboard</li>
                <li>Review pending applications</li>
                <li>Approve/reject test applications</li>
                <li>Monitor system health</li>
                <li>Create additional UAT accounts</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Manager (uat-manager@procannedu.com)</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Login and complete onboarding wizard</li>
                <li>View organization dashboard</li>
                <li>Send employee invitations</li>
                <li>Monitor team progress</li>
                <li>Generate compliance reports</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Coordinator (uat-coordinator@procannedu.com)</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Login and access coordinator tools</li>
                <li>View training progress dashboard</li>
                <li>Manage seat assignments</li>
                <li>Send training reminders</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Employees (uat-employee1/2@procannedu.com)</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Login and view student dashboard</li>
                <li>Start course from Module 0</li>
                <li>Complete all 23 modules</li>
                <li>Take and pass final exam (80%+)</li>
                <li>Download certificate</li>
                <li>Verify certificate on public portal</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
