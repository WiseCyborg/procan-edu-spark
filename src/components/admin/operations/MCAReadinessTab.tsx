import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComplianceReviewWorkflow } from '@/components/admin/compliance/ComplianceReviewWorkflow';
import { PilotProgramDashboard } from '@/components/admin/pilot/PilotProgramDashboard';
import { AlertTriangle, CheckCircle, Database, FileText, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const MCAReadinessTab = () => {
  const { toast } = useToast();
  const [isPopulating, setIsPopulating] = useState(false);

  const populateCOMAR = async () => {
    setIsPopulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('populate-comar-content');
      
      if (error) throw error;

      toast({
        title: 'COMAR Content Populated',
        description: `Successfully populated ${data.successful} regulatory sections`,
      });
    } catch (error: any) {
      toast({
        title: 'Population Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MCA Application Readiness Center</CardTitle>
          <CardDescription>
            Track compliance review progress, pilot program metrics, and MCA application preparation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical Actions Required:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Complete formal COMAR compliance review for all 23 modules</li>
                <li>Verify email domain (procannedu.com) in Resend dashboard</li>
                <li>Recruit 20-30 pilot program participants</li>
                <li>Issue at least 10 verified certificates through pilot program</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">COMAR Reviews</div>
                    <div className="text-2xl font-bold">0/23</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Pilot Participants</div>
                    <div className="text-2xl font-bold">0/20</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Test Certificates</div>
                    <div className="text-2xl font-bold">0/10</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 mb-6">
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Step 1: Populate COMAR Regulatory Content</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Load official COMAR 14.17.05 sections into the regulatory_content table to enable live compliance tracking
                </p>
                <Button onClick={populateCOMAR} disabled={isPopulating}>
                  <Database className="h-4 w-4 mr-2" />
                  {isPopulating ? 'Populating...' : 'Populate COMAR 14.17.05 Sections'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Step 2: Verify Email Domain</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add DNS records for procannedu.com in Resend dashboard to enable certificate delivery
                </p>
                <Button variant="outline" onClick={() => window.open('https://resend.com/domains', '_blank')}>
                  Open Resend Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="compliance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compliance">COMAR Compliance Review</TabsTrigger>
          <TabsTrigger value="pilot">Pilot Program Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance">
          <ComplianceReviewWorkflow />
        </TabsContent>

        <TabsContent value="pilot">
          <PilotProgramDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};
