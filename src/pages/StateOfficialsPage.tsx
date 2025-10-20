import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Phone, Mail, Clock, Download, FileCheck, TrendingUp, Building2, Users, Award } from 'lucide-react';

export default function StateOfficialsPage() {
  const { data: metrics } = useQuery({
    queryKey: ['state-metrics'],
    queryFn: async () => {
      const [
        { count: totalCertificates },
        { count: activeOrganizations },
        { data: progressData }
      ] = await Promise.all([
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('is_revoked', false),
        supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('admin_approved', true),
        supabase.from('user_progress').select('user_id, is_completed')
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
        avgCompletion: Math.round(avgCompletion)
      };
    }
  });

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <Badge className="mb-4 text-lg px-4 py-2">
          <Shield className="h-5 w-5 mr-2" />
          For Maryland State Officials
        </Badge>
        <h1 className="text-4xl font-bold mb-4">
          Maryland Cannabis Administration Partnership
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Comprehensive documentation and real-time access for state regulatory oversight
        </p>
      </div>

      {/* Application Status */}
      <Card className="mb-8 border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-primary" />
            MCA Application Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Application Status</p>
              <p className="text-lg font-semibold">Application in Preparation</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submission Target</p>
              <p className="text-lg font-semibold">Within 14 Days</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">MCA Reference Portal</p>
              <a 
                href="https://cannabis.maryland.gov/pages/responsible_vendor_training.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-primary hover:underline"
              >
                cannabis.maryland.gov
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">COMAR Compliance</p>
              <p className="text-lg font-semibold">14.17.05</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Officer Contact */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Compliance Officer Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Chief Compliance Officer</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <a href="mailto:compliance@procannedu.com" className="text-primary hover:underline font-medium">
                  compliance@procannedu.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Available upon request</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>Monday-Friday, 9:00 AM - 5:00 PM EST</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Direct line for state officials, regulatory inquiries, and audit coordination
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statewide Impact Metrics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Statewide Impact Metrics
          </CardTitle>
          <p className="text-sm text-muted-foreground">Real-time data updated automatically</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{metrics?.totalCertificates || 0}</p>
              <p className="text-sm text-muted-foreground">Active Certificates</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{metrics?.activeOrganizations || 0}</p>
              <p className="text-sm text-muted-foreground">Partner Dispensaries</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{metrics?.avgCompletion || 0}%</p>
              <p className="text-sm text-muted-foreground">Average Completion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Access Portal */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Audit Access Portal</CardTitle>
          <p className="text-sm text-muted-foreground">Real-time access to compliance data for state review</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold">Real-time Enrollment Data</p>
                <p className="text-sm text-muted-foreground">Current student registrations and progress</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold">Certificate Verification API</p>
                <p className="text-sm text-muted-foreground">Programmatic access for state systems</p>
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/verify-certificate'}>
                Access Portal
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold">Compliance Report Generation</p>
                <p className="text-sm text-muted-foreground">Monthly automated reports</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Latest Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Compliance Matrix */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Regulatory Compliance Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4"
              onClick={() => window.location.href = '/compliance/curriculum-matrix'}
            >
              <div className="text-left w-full">
                <p className="font-semibold">COMAR 14.17.05 Compliance Matrix</p>
                <p className="text-sm text-muted-foreground">Full curriculum mapping to state requirements</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4"
              onClick={() => window.location.href = '/compliance/content-review'}
            >
              <div className="text-left w-full">
                <p className="font-semibold">Annual Content Review Process</p>
                <p className="text-sm text-muted-foreground">Regulatory update tracking and integration</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Security & Privacy Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 border rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-semibold">SSL/TLS</p>
              <p className="text-xs text-muted-foreground">Encrypted</p>
            </div>
            <div className="p-4 border rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-semibold">WCAG 2.1 AA</p>
              <p className="text-xs text-muted-foreground">Accessible</p>
            </div>
            <div className="p-4 border rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-semibold">SOC 2 Type II</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div className="p-4 border rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-semibold">Data Residency</p>
              <p className="text-xs text-muted-foreground">US-Based</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
