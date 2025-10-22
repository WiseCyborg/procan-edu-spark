import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, FileText, CheckCircle } from "lucide-react";
import { PayPalConfigurationPanel } from "@/components/admin/PayPalConfigurationPanel";
import { GapAnalysisDashboard } from "@/components/admin/GapAnalysisDashboard";
import { SupportQueueManager } from "@/components/admin/SupportQueueManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gap-analysis">Gap Analysis</TabsTrigger>
          <TabsTrigger value="support">Support Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* PayPal Configuration Panel */}
          <PayPalConfigurationPanel onStatusChange={setPaypalStatus} />

          {/* Future Components Placeholders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border bg-card border-dashed">
              <CardHeader>
                <CardTitle className="text-foreground">📊 Application Lifecycle Timeline</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Coming in Phase 3 - Real-time tracking of application workflows
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border bg-card border-dashed">
              <CardHeader>
                <CardTitle className="text-foreground">🔍 Advanced Search & Filtering</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Coming in Phase 3 - Powerful search across all entities
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gap-analysis">
          <GapAnalysisDashboard />
        </TabsContent>

        <TabsContent value="support">
          <SupportQueueManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
