import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, Mail, GitBranch, DollarSign, Heart, Shield, Wrench, Users, ShieldCheck } from 'lucide-react';
import { useOperationsMetrics } from '@/hooks/useOperationsMetrics';
import { OverviewTab } from '@/components/admin/operations/OverviewTab';
import { EmailTab } from '@/components/admin/operations/EmailTab';
import { PipelineTab } from '@/components/admin/operations/PipelineTab';
import { PaymentsTab } from '@/components/admin/operations/PaymentsTab';
import { HealthTab } from '@/components/admin/operations/HealthTab';
import { SecurityTab } from '@/components/admin/operations/SecurityTab';
import { TestingTab } from '@/components/admin/operations/TestingTab';
import { UsersTab } from '@/components/admin/operations/UsersTab';
import { RegressionTab } from '@/components/admin/operations/RegressionTab';

export default function OperationsCommandCenter() {
  const { metrics, loading } = useOperationsMetrics();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary" />
                Operations Command Center
                <Badge variant="outline" className="ml-2 animate-pulse">
                  LIVE
                </Badge>
              </h1>
              <p className="text-muted-foreground mt-1">Real-time platform monitoring and management</p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.activeUsers}</div>
                <div className="text-xs text-muted-foreground">Active Now</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{metrics.emailsSent24h}</div>
                <div className="text-xs text-muted-foreground">Emails (24h)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{metrics.systemHealth}%</div>
                <div className="text-xs text-muted-foreground">Health</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-9 gap-2 bg-card border-2 p-2 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
              {metrics.failedEmails > 0 && (
                <Badge variant="destructive" className="ml-1">{metrics.failedEmails}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Health
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="regression" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Regression
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="email"><EmailTab /></TabsContent>
          <TabsContent value="pipeline"><PipelineTab /></TabsContent>
          <TabsContent value="payments"><PaymentsTab /></TabsContent>
          <TabsContent value="health"><HealthTab /></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
          <TabsContent value="testing"><TestingTab /></TabsContent>
          <TabsContent value="regression"><RegressionTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
