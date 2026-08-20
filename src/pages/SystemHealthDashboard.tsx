import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Users, UserX, Shield, ExternalLink, BarChart3, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RealSystemHealthPanel } from '@/components/admin/RealSystemHealthPanel';
import { IntegrationHealthMonitor } from '@/components/admin/IntegrationHealthMonitor';
import { RegulatorySyncPanel } from '@/components/admin/RegulatorySyncPanel';
import { DispensaryPipelineMonitor } from '@/components/admin/DispensaryPipelineMonitor';

interface OrphanedManager {
  id: string;
  contact_person: string | null;
  contact_email: string | null;
  organization_name: string | null;
  created_at: string;
}

const SystemHealthDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [orphanedManagers, setOrphanedManagers] = useState<OrphanedManager[] | null>(null);
  const [queryErrors, setQueryErrors] = useState<string[]>([]);
  const navigate = useNavigate();

  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    const errors: string[] = [];

    // Orphaned managers (organizations approved + registered but with no staff invitations)
    let orphans: OrphanedManager[] | null = null;
    try {
      const { data, error } = await supabase
        .from('dispensary_applications')
        .select('id, contact_person, contact_email, organization_name, created_at')
        .eq('registration_completed', true)
        .eq('application_status', 'approved');

      if (error) throw error;

      const withoutInvites: OrphanedManager[] = [];
      for (const app of data || []) {
        const { count, error: inviteError } = await supabase
          .from('staff_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', app.id);

        if (inviteError) throw inviteError;
        if (count === 0) withoutInvites.push(app as OrphanedManager);
      }
      orphans = withoutInvites;
    } catch (err: any) {
      errors.push(`Orphaned manager query failed: ${err?.message || 'unknown error'}`);
    }

    setOrphanedManagers(orphans);
    setQueryErrors(errors);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const hasQueryErrors = queryErrors.length > 0;
  // Any query/schema-cache error forces a degraded/error posture. Never "healthy".
  const overallLabel = hasQueryErrors
    ? 'Error — health cannot be determined'
    : 'Degraded until telemetry proves otherwise';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground">
            Observed telemetry only — absent telemetry is reported as degraded, never healthy
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/health-report')} variant="default">
            <BarChart3 className="h-4 w-4 me-2" />
            Full Health Report
          </Button>
          <Button onClick={fetchHealthData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 me-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Alert variant={hasQueryErrors ? 'destructive' : 'default'}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Page-level status: {overallLabel}</AlertTitle>
        <AlertDescription>
          {hasQueryErrors ? (
            <ul className="list-disc list-inside mt-1 space-y-1">
              {queryErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : (
            <>
              Sub-panels report Degraded when telemetry is missing. Provider acceptance is not
              delivery, and zero observed checks is not a passing check.
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Real, instrumented system health (email / database / edge functions / pipeline) */}
      <RealSystemHealthPanel />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={hasQueryErrors || orphanedManagers === null || orphanedManagers.length > 0 ? 'border-yellow-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {orphanedManagers && orphanedManagers.length === 0 ? (
                <Users className="h-5 w-5 text-green-600" />
              ) : (
                <UserX className="h-5 w-5 text-yellow-600" />
              )}
              Orphaned Managers
            </CardTitle>
            <CardDescription>Approved, registered organizations with no staff invitations</CardDescription>
          </CardHeader>
          <CardContent>
            {orphanedManagers === null ? (
              <div className="space-y-1">
                <Badge variant="secondary" className="bg-yellow-600 text-white">Degraded</Badge>
                <p className="text-sm text-muted-foreground">
                  Query failed — count unknown, this check did not pass.
                </p>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{orphanedManagers.length}</div>
                <p className="text-sm text-muted-foreground">Managers without invitations</p>
                {orphanedManagers.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {orphanedManagers.slice(0, 3).map((m) => (
                      <div key={m.id} className="p-2 bg-muted rounded text-sm">
                        <div className="font-medium">{m.contact_person}</div>
                        <div className="text-xs text-muted-foreground">{m.contact_email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              Security Status
            </CardTitle>
            <CardDescription>Static remediation record — not live telemetry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Function Search Paths</span>
                <Badge variant="default" className="bg-green-600">Fixed via migration</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Extension Schema</span>
                <Badge variant="secondary" className="bg-yellow-600 text-white">Accepted limitation</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Postgres Upgrade</span>
                <Badge variant="destructive">Required</Badge>
              </div>
              <div className="pt-2 border-t">
                <a
                  href="https://supabase.com/dashboard/project/zhmpwczrvitomsxjwpzc/settings/infrastructure"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Upgrade Postgres <ExternalLink className="h-3 w-3" />
                </a>
                <p className="text-xs text-muted-foreground mt-1">
                  See docs/SECURITY_FIX_IMPLEMENTATION.md
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Edge Function Deployment Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Deployment counts are not instrumented in this build. See the Edge Functions section
            above, which reports Degraded / telemetry not instrumented / zero observed checks rather
            than a deployed count.
          </p>
        </CardContent>
      </Card>

      {/* Integration Health Monitor */}
      <IntegrationHealthMonitor />

      {/* Regulatory Sync (COMAR + Federal) */}
      <RegulatorySyncPanel />

      {/* Dispensary Pipeline Monitor */}
      <DispensaryPipelineMonitor />
    </div>
  );
};

export default SystemHealthDashboard;
