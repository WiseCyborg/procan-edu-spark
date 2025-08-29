import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileDown, AlertTriangle, Shield, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ComplianceReport {
  organization_name: string;
  total_employees: number;
  trained_employees: number;
  completion_rate: number;
  active_certificates: number;
  expired_certificates: number;
  compliance_score: number;
  risk_level: string;
}

interface ComplianceMetric {
  id: string;
  organization_id: string;
  metric_type: string;
  metric_value: number;
  compliance_score: number;
  risk_level: string;
  calculation_date: string;
  metadata: any;
}

export const ComplianceReportingDashboard = () => {
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      
      // Fetch compliance reports
      const { data: reports, error: reportsError } = await supabase
        .rpc('generate_compliance_report');
      
      if (reportsError) throw reportsError;

      // Fetch compliance metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('compliance_metrics')
        .select('*')
        .order('calculation_date', { ascending: false })
        .limit(100);
      
      if (metricsError) throw metricsError;

      setComplianceReports(reports || []);
      setComplianceMetrics(metrics || []);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportComplianceReport = async (exportFormat: 'csv' | 'pdf') => {
    try {
      setExporting(true);
      
      // Generate CSV export
      if (exportFormat === 'csv') {
        const csvContent = [
          // Headers
          'Organization,Total Employees,Trained Employees,Completion Rate,Active Certificates,Expired Certificates,Compliance Score,Risk Level',
          // Data rows
          ...complianceReports.map(report => 
            `"${report.organization_name}",${report.total_employees},${report.trained_employees},${report.completion_rate}%,${report.active_certificates},${report.expired_certificates},${report.compliance_score},${report.risk_level}`
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Export Complete",
        description: `Compliance report exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export compliance report",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const getOverallCompliance = () => {
    if (complianceReports.length === 0) return 0;
    const avgScore = complianceReports.reduce((sum, report) => sum + report.compliance_score, 0) / complianceReports.length;
    return Math.round(avgScore);
  };

  const getHighRiskOrganizations = () => {
    return complianceReports.filter(report => report.risk_level === 'high');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Compliance Reporting</h2>
          <p className="text-muted-foreground">
            Comprehensive compliance tracking and regulatory reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => exportComplianceReport('csv')} 
            disabled={exporting}
            variant="outline"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchComplianceData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getOverallCompliance()}%</div>
            <Progress value={getOverallCompliance()} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceReports.length}</div>
            <p className="text-xs text-muted-foreground">Active organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {getHighRiskOrganizations().length}
            </div>
            <p className="text-xs text-muted-foreground">Organizations at risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(), 'MMM dd')}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'yyyy HH:mm')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Alert */}
      {getHighRiskOrganizations().length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {getHighRiskOrganizations().length} organization(s) have high compliance risk and require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="trends">Compliance Trends</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Compliance Status</CardTitle>
              <CardDescription>
                Current compliance scores and risk levels for all organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceReports.map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{report.organization_name}</h3>
                        <Badge variant={getRiskBadgeVariant(report.risk_level)}>
                          {report.risk_level} risk
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">{report.total_employees}</span> employees
                        </div>
                        <div>
                          <span className="font-medium">{report.completion_rate}%</span> completion
                        </div>
                        <div>
                          <span className="font-medium">{report.active_certificates}</span> certificates
                        </div>
                        <div>
                          <span className="font-medium">{report.expired_certificates}</span> expired
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{report.compliance_score}%</div>
                      <Progress 
                        value={report.compliance_score} 
                        className="w-24 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trends</CardTitle>
              <CardDescription>
                Historical compliance metrics and trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceMetrics.slice(0, 10).map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{metric.metric_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(metric.calculation_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{metric.metric_value}</div>
                      <Badge variant={getRiskBadgeVariant(metric.risk_level)} className="ml-2">
                        {metric.risk_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Violations</CardTitle>
              <CardDescription>
                Current violations and required actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getHighRiskOrganizations().map((org, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{org.organization_name}</strong> has a compliance score of {org.compliance_score}% 
                      with {org.expired_certificates} expired certificates and {org.total_employees - org.trained_employees} untrained employees.
                    </AlertDescription>
                  </Alert>
                ))}
                {getHighRiskOrganizations().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No compliance violations detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};