import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, FileText, CheckCircle } from "lucide-react";
import { PayPalConfigurationPanel } from "@/components/admin/PayPalConfigurationPanel";
import { GapAnalysisDashboard } from "@/components/admin/GapAnalysisDashboard";
import { useState } from "react";

export default function UnifiedOperationsDashboard() {
  const [paypalStatus, setPaypalStatus] = useState<'connected' | 'error' | 'testing'>('testing');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            🎯 Unified Operations Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring and management of all platform operations
          </p>
        </div>
        <Badge variant="secondary" className="animate-pulse">
          <Activity className="h-3 w-3 mr-1" />
          LIVE
        </Badge>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardDescription className="text-muted-foreground">System Health</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              <CheckCircle className="h-5 w-5 inline mr-2 text-green-600" />
              Operational
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardDescription className="text-muted-foreground">PayPal Status</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              {paypalStatus === 'connected' && (
                <>
                  <CheckCircle className="h-5 w-5 inline mr-2 text-green-600" />
                  Connected
                </>
              )}
              {paypalStatus === 'error' && (
                <>
                  <Activity className="h-5 w-5 inline mr-2 text-red-600" />
                  Error
                </>
              )}
              {paypalStatus === 'testing' && (
                <>
                  <Activity className="h-5 w-5 inline mr-2 text-yellow-600 animate-pulse" />
                  Testing
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardDescription className="text-muted-foreground">Active Users</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              <Users className="h-5 w-5 inline mr-2 text-primary" />
              <span>--</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardDescription className="text-muted-foreground">Pending Applications</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              <FileText className="h-5 w-5 inline mr-2 text-primary" />
              <span>--</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* PayPal Configuration Panel */}
      <PayPalConfigurationPanel onStatusChange={setPaypalStatus} />

      {/* Gap Analysis Dashboard */}
      <GapAnalysisDashboard />

      {/* Future Components Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card border-dashed">
          <CardHeader>
            <CardTitle className="text-foreground">📊 Application Lifecycle Timeline</CardTitle>
            <CardDescription className="text-muted-foreground">
              Coming in Phase 3 - Real-time tracking of application workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            This will show complete workflow from application submission → employee enrollment
          </CardContent>
        </Card>

        <Card className="border-border bg-card border-dashed">
          <CardHeader>
            <CardTitle className="text-foreground">⚡ Edge Function Monitor</CardTitle>
            <CardDescription className="text-muted-foreground">
              Coming in Phase 5 - Real-time edge function execution logs
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Track performance and failures of all edge functions in real-time
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card border-dashed">
        <CardHeader>
          <CardTitle className="text-foreground">🔐 Authentication Activity Feed</CardTitle>
          <CardDescription className="text-muted-foreground">
            Coming in Phase 4 - Real-time user signups, logins, and MFA events
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Monitor all authentication events as they happen across the platform
        </CardContent>
      </Card>
    </div>
  );
}
