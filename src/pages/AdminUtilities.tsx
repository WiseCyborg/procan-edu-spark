import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Database, RefreshCw, Key, FileCheck, AlertCircle } from 'lucide-react';
import { SystemMaintenancePanel } from '@/components/admin/SystemMaintenancePanel';

const AdminUtilities = () => {
  const [reconciling, setReconciling] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [maxUses, setMaxUses] = useState('10');
  const [expiryDays, setExpiryDays] = useState('90');
  const [pendingApps, setPendingApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    fetchOrganizations();
    fetchPendingApplications();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, course_credits')
        .order('name');
      
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchPendingApplications = async () => {
    setLoadingApps(true);
    try {
      const { data, error } = await supabase
        .from('dispensary_applications')
        .select('*')
        .eq('application_status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPendingApps(data || []);
    } catch (error: any) {
      console.error('Error fetching pending applications:', error);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleReconcileSeats = async () => {
    setReconciling(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-seats', {
        method: 'POST'
      });

      if (error) throw error;

      setResult(data);
      toast.success(`Reconciliation complete! ${data.seats_created} seats created for ${data.organizations_reconciled} organizations`);
      fetchOrganizations(); // Refresh org data
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      toast.error(error.message || 'Failed to reconcile seats');
    } finally {
      setReconciling(false);
    }
  };

  const handleGenerateJoinCode = async () => {
    if (!selectedOrg) {
      toast.error('Please select an organization');
      return;
    }

    setGeneratingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-join-code', {
        body: {
          organizationId: selectedOrg,
          maxUses: parseInt(maxUses),
          expiryDays: parseInt(expiryDays)
        }
      });

      if (error) throw error;

      toast.success(`Join code generated: ${data.join_code}`);
      setSelectedOrg('');
    } catch (error: any) {
      console.error('Join code generation error:', error);
      toast.error(error.message || 'Failed to generate join code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleApproveApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('dispensary_applications')
        .update({ 
          application_status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application approved successfully');
      fetchPendingApplications();
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast.error(error.message || 'Failed to approve application');
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('dispensary_applications')
        .update({ 
          application_status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application rejected');
      fetchPendingApplications();
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast.error(error.message || 'Failed to reject application');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Utilities</h1>
        <p className="text-muted-foreground mt-1">Database maintenance and system operations</p>
      </div>

      <SystemMaintenancePanel />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Reconcile Seats</CardTitle>
              <CardDescription>
                Allocate missing seats for organizations with course credits but no available seats
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This utility checks all organizations with course credits and ensures they have the correct number of seats allocated. 
            It will create seats for any organization that has a deficit.
          </p>
          
          <Button 
            onClick={handleReconcileSeats} 
            disabled={reconciling}
            className="w-full"
          >
            {reconciling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reconciling Seats...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Seat Reconciliation
              </>
            )}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Reconciliation Results</h4>
              <div className="space-y-1 text-sm">
                <p>Organizations checked: {result.organizations_checked}</p>
                <p>Organizations reconciled: {result.organizations_reconciled}</p>
                <p className="text-green-600 font-semibold">Seats created: {result.seats_created}</p>
                <p>Skipped (no deficit): {result.skipped}</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 text-red-600">
                    <p className="font-semibold">Errors:</p>
                    {result.errors.map((err: any, idx: number) => (
                      <p key={idx}>- {err.organization}: {err.error}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Generate Join Code</CardTitle>
              <CardDescription>
                Create join codes for organizations to invite employees
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} ({org.course_credits} credits)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDays">Expiry (Days)</Label>
              <Input
                id="expiryDays"
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                min="1"
              />
            </div>
          </div>

          <Button 
            onClick={handleGenerateJoinCode} 
            disabled={generatingCode || !selectedOrg}
            className="w-full"
          >
            {generatingCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Generate Join Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Pending Applications</CardTitle>
              <CardDescription>
                Review and approve dispensary applications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingApps ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingApps.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending applications
            </p>
          ) : (
            <div className="space-y-4">
              {pendingApps.map((app) => {
                const daysPending = Math.floor(
                  (new Date().getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue = daysPending > 2;

                return (
                  <div
                    key={app.id}
                    className={`p-4 border rounded-lg ${
                      isOverdue ? 'border-destructive bg-destructive/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{app.organization_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Contact: {app.contact_person} ({app.contact_email})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          License: {app.license_number || 'Not provided'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {daysPending} days pending
                            </span>
                          )}
                          {!isOverdue && (
                            <span className="text-xs text-muted-foreground">
                              {daysPending} days pending
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveApplication(app.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectApplication(app.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUtilities;
