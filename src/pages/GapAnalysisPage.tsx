import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedGapOverview } from '@/components/admin/gaps/UnifiedGapOverview';
import { TrainingGapDashboard } from '@/components/admin/gaps/TrainingGapDashboard';
import { DataQualityGapDashboard } from '@/components/admin/gaps/DataQualityGapDashboard';
import { PaymentGapDashboard } from '@/components/admin/gaps/PaymentGapDashboard';
import { GapFixesExecutor } from '@/components/admin/GapFixesExecutor';
import { GapCategory } from '@/services/gapDetectionService';
import { useState } from 'react';

export default function GapAnalysisPage() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const handleCategoryClick = (category: GapCategory) => {
    const tabMap: Record<GapCategory, string> = {
      compliance: 'overview',
      training: 'training',
      system: 'overview',
      engagement: 'overview',
      data: 'data',
      payment: 'payment',
    };
    setActiveTab(tabMap[category]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gap Analysis Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive system-wide gap detection and resolution tracking
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="week1-fixes">Week 1 Fixes</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="data">Data Quality</TabsTrigger>
          <TabsTrigger value="payment">Payment & License</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <UnifiedGapOverview onCategoryClick={handleCategoryClick} />
        </TabsContent>

        <TabsContent value="week1-fixes">
          <GapFixesExecutor />
        </TabsContent>

        <TabsContent value="training">
          <TrainingGapDashboard />
        </TabsContent>

        <TabsContent value="data">
          <DataQualityGapDashboard />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentGapDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
