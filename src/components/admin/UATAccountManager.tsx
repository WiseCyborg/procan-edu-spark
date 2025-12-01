import React, { useState } from 'react';
import { TestTube2, Plus, RotateCcw, Trash2, Copy, Eye, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UATAccountResetDialog } from './UATAccountResetDialog';
import { UATAccountCreator } from './UATAccountCreator';
import { formatDistanceToNow } from 'date-fns';

export const UATAccountManager = () => {
  const queryClient = useQueryClient();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Fetch UAT accounts
  const { data: uatAccounts, isLoading } = useQuery({
    queryKey: ['uat-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uat_accounts')
        .select(`
          *,
          profiles:user_id (first_name, last_name, email_cache, organization_id),
          user_progress:user_id (count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Reset account mutation
  const resetMutation = useMutation({
    mutationFn: async ({ userId, resetSeats }: { userId: string; resetSeats: boolean }) => {
      const { data, error } = await supabase.functions.invoke('reset-uat-account', {
        body: { userId, resetSeats }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('UAT account reset successfully');
      queryClient.invalidateQueries({ queryKey: ['uat-accounts'] });
      setResetDialogOpen(false);
      setSelectedAccount(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to reset account: ${error.message}`);
    }
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Mark as inactive instead of deleting
      const { error } = await supabase
        .from('uat_accounts')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('UAT account deleted');
      queryClient.invalidateQueries({ queryKey: ['uat-accounts'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete account: ${error.message}`);
    }
  });

  const handleReset = (account: any) => {
    setSelectedAccount(account);
    setResetDialogOpen(true);
  };

  const handleCopyCredentials = (email: string, passwordHint: string) => {
    const credentials = `Email: ${email}\nPassword: ${passwordHint}`;
    navigator.clipboard.writeText(credentials);
    toast.success('Credentials copied to clipboard');
  };

  const totalAccounts = uatAccounts?.length || 0;
  const managerCount = uatAccounts?.filter(a => a.account_type === 'manager').length || 0;
  const employeeCount = uatAccounts?.filter(a => a.account_type === 'employee').length || 0;
  const activeCount = uatAccounts?.filter(a => a.is_active).length || 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total UAT Accounts</CardTitle>
            <TestTube2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAccounts}</div>
            <p className="text-xs text-muted-foreground">Test accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <TestTube2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managerCount}</div>
            <p className="text-xs text-muted-foreground">Manager accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <TestTube2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
            <p className="text-xs text-muted-foreground">Employee accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TestTube2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts">Active UAT Accounts</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading UAT accounts...</div>
          ) : uatAccounts && uatAccounts.length > 0 ? (
            <div className="space-y-2">
              {uatAccounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{account.email}</span>
                          <Badge variant={account.account_type === 'manager' ? 'default' : 'secondary'}>
                            {account.account_type}
                          </Badge>
                          {account.reset_count > 0 && (
                            <Badge variant="outline">
                              Reset {account.reset_count}x
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {account.last_reset_at && (
                            <span>
                              Last reset: {formatDistanceToNow(new Date(account.last_reset_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyCredentials(account.email, account.password_hint || 'ProCann2024!')}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Credentials
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReset(account)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`Delete UAT account for ${account.email}?`)) {
                              deleteMutation.mutate(account.user_id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TestTube2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No UAT accounts created yet</p>
                <p className="text-sm text-muted-foreground">
                  Create test accounts to validate Manager and Employee workflows
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="create">
          <UATAccountCreator />
        </TabsContent>
      </Tabs>

      {/* Reset Dialog */}
      {selectedAccount && (
        <UATAccountResetDialog
          open={resetDialogOpen}
          onOpenChange={setResetDialogOpen}
          account={selectedAccount}
          onConfirm={(resetSeats) => {
            resetMutation.mutate({
              userId: selectedAccount.user_id,
              resetSeats
            });
          }}
          isResetting={resetMutation.isPending}
        />
      )}
    </div>
  );
};
