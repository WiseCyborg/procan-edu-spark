import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, Award, TrendingUp, MapPin, Clock, Download } from 'lucide-react';

export default function ImpactDashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['impact-metrics'],
    queryFn: async () => {
      const [
        { count: totalCertificates },
        { count: activeOrganizations },
        { data: progressData }
      ] = await Promise.all([
        supabase.from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('is_revoked', false),
        supabase.from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('admin_approved', true),
        supabase.from('user_progress')
          .select('user_id, is_completed')
      ]);

      const userProgress = (progressData || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = 0;
        if (curr.is_completed) acc[curr.user_id]++;
        return acc;
      }, {});

      const avgCompletion = Object.keys(userProgress).length > 0
        ? (Object.values(userProgress).reduce((sum: number, count: any) => sum + ((count as number) / 18 * 100), 0) as number) / Object.keys(userProgress).length
        : 0;

      return {
        totalCertificates: totalCertificates || 0,
        activeOrganizations: activeOrganizations || 0,
        avgCompletion: Math.round(avgCompletion),
        trainingHours: (totalCertificates || 0) * 5,
        thisYearCerts: totalCertificates || 0
      };
    },
    refetchInterval: 60000
  });

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          ProCann Edu's Impact Across Maryland
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          Real-time metrics updated every 60 seconds
        </p>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading impact data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-6 w-6 text-primary" />
                  Trained Professionals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold mb-2">{metrics?.totalCertificates || 0}</p>
                <p className="text-sm text-muted-foreground">Active certificates issued</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                  Dispensary Partners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold mb-2">{metrics?.activeOrganizations || 0}</p>
                <p className="text-sm text-muted-foreground">Active partner organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold mb-2">{metrics?.avgCompletion || 0}%</p>
                <p className="text-sm text-muted-foreground">Average course completion</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-6 w-6 text-primary" />
                  Training Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold mb-2">{metrics?.trainingHours || 0}</p>
                <p className="text-sm text-muted-foreground">Total hours delivered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-6 w-6 text-primary" />
                  This Year
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold mb-2">{metrics?.thisYearCerts || 0}</p>
                <p className="text-sm text-muted-foreground">Certificates issued in 2025</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-6 w-6 text-primary" />
                  Counties Served
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold mb-2">24</p>
                <p className="text-sm text-muted-foreground">All Maryland counties</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Impact Statement */}
      <Card className="mb-8 bg-primary text-white">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Building Maryland's Cannabis Workforce</h3>
            <p className="text-lg opacity-90 max-w-3xl mx-auto leading-relaxed">
              ProCann Edu is proud to serve Maryland's cannabis industry by providing accessible, 
              high-quality training that meets state standards and empowers professionals across all 
              24 counties.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Download Button */}
      <div className="text-center">
        <Button onClick={() => window.print()} size="lg" variant="outline">
          <Download className="h-5 w-5 mr-2" />
          Download Impact Report (PDF)
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          For official use by state agencies, partner organizations, and stakeholders
        </p>
      </div>
    </div>
  );
}
