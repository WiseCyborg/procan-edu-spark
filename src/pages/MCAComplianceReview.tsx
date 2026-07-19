import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  FileText, 
  Users, 
  Award, 
  TrendingUp, 
  MapPin, 
  Search, 
  Download,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { ComplianceDisclaimer } from '@/components/ComplianceDisclaimer';
import { useMCAMetrics } from '@/hooks/useMCAMetrics';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const MCAComplianceReview = () => {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useMCAMetrics();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCertificateSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/verify-certificate?number=${searchQuery.trim()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 py-16 px-4">
        <div className="container mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 py-16 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              MCA Live Compliance Dashboard
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Real-time oversight and certificate verification for Maryland Cannabis Administration
          </p>
        </div>

        {/* Certificate Verification Search - Prominent */}
        <Card className="mb-8 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6" />
              Verify Certificate
            </CardTitle>
            <CardDescription>
              Enter certificate number to instantly verify authenticity and view details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter certificate number (e.g., MCA-2025-00123)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCertificateSearch()}
                className="text-lg"
              />
              <Button onClick={handleCertificateSearch} size="lg">
                <Search className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hero Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Licensed Dispensaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {metrics?.totalDispensaries || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active approved organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Certified Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {metrics?.totalCertifiedEmployees || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valid RVT certifications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Issued This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {metrics?.certificatesIssuedThisMonth || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                New certifications in {new Date().toLocaleString('default', { month: 'long' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {metrics?.certificatesExpiringSoon || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Expiring within 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Platform Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Company Information</h3>
              <p className="text-muted-foreground">
                <strong>Legal Name:</strong> ProCann Edu, LLC<br />
                <strong>Location:</strong> Baltimore, Maryland<br />
                <strong>Service Area:</strong> All 24 Maryland counties<br />
                <strong>Platform Type:</strong> Online RVT training and compliance management
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Contact Details for Regulatory Inquiries</h3>
              <p className="text-muted-foreground">
                <strong>Email:</strong> compliance@procannedu.com<br />
                <strong>Phone:</strong> Available upon request<br />
                <strong>Response Time:</strong> Within 24 hours for regulatory inquiries
              </p>
            </div>
          </CardContent>
        </Card>

        {/* COMAR Alignment Matrix */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              COMAR 14.17.15.05 Alignment Matrix
            </CardTitle>
            <CardDescription>
              Module-by-module mapping to Maryland regulations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Our 23-module curriculum is specifically designed to meet and exceed COMAR 14.17.15.05 requirements for Responsible Vendor Training in Maryland.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Drug-Free Workplace Policy</strong>
                  <p className="text-sm text-muted-foreground">COMAR 21.11.08.03 compliance included</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Diversion Prevention</strong>
                  <p className="text-sm text-muted-foreground">Comprehensive coverage of prevention protocols</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Standard Operating Procedures</strong>
                  <p className="text-sm text-muted-foreground">Maryland-specific operational guidelines</p>
                </div>
              </div>
            </div>
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Current Status:</strong> Formal COMAR compliance review in progress<br />
                <strong className="text-foreground">Update Protocol:</strong> Automated monitoring system with formal review workflow<br />
                <strong className="text-foreground">Review Frequency:</strong> Six-month compliance audits with continuous monitoring
              </p>
            </div>
            <Button variant="outline" className="mt-4">
              <FileText className="h-4 w-4 mr-2" />
              View Detailed Curriculum Matrix
            </Button>
          </CardContent>
        </Card>

        {/* Data Substantiation */}
        <Card className="mb-8">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-primary/20 p-6">
            <CardTitle className="flex items-center gap-2 text-foreground font-bold">
              <FileText className="h-6 w-6 text-primary" />
              Regulatory Compliance & Data Substantiation
            </CardTitle>
            <CardDescription className="text-foreground/80">
              Supporting documentation for platform claims
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ComplianceDisclaimer />
          </CardContent>
        </Card>

        {/* Platform Security & Accessibility */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-600" />
              Platform Security & Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Data Encryption & Security</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Industry-standard SSL/TLS encryption for all data transmission</p>
                <p>• Supabase enterprise-grade database security</p>
                <p>• Regular security audits and penetration testing</p>
                <p>• SOC 2 Type II compliance (via Supabase infrastructure)</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Student Data Protection</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• FERPA-aligned student privacy protections</p>
                <p>• Secure certificate verification system</p>
                <p>• Role-based access control (RBAC)</p>
                <p>• Data retention policies compliant with Maryland state law</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Accessibility Standards</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• WCAG 2.1 AA compliance</p>
                <p>• Screen reader compatibility</p>
                <p>• Keyboard navigation support</p>
                <p>• Mobile-responsive design for all devices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructor Credentials */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-yellow-600" />
              Instructor Credentials & Curriculum Development
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Team Qualifications</h3>
              <p className="text-muted-foreground">
                Our curriculum development team includes Maryland-based cannabis educators, compliance professionals, and industry veterans with combined 50+ years of experience in cannabis regulations and training.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Maryland Expertise</h3>
              <p className="text-muted-foreground">
                Content creators are Maryland residents with direct experience in state cannabis operations, regulatory compliance, and workforce training specific to Maryland's unique legal framework.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Curriculum Development Process</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Quarterly review by Maryland cannabis law experts</p>
                <p>• Continuous monitoring of MCA regulatory updates</p>
                <p>• Student feedback integration and content refinement</p>
                <p>• Industry advisory board input</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality Assurance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Quality Assurance Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Content Review Cycle</h3>
              <p className="text-muted-foreground">
                Monthly monitoring of regulatory changes with immediate content updates when MCA issues new guidance or revisions to COMAR 14.17.15.05
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Regulatory Monitoring</h3>
              <p className="text-muted-foreground">
                Automated tracking of Maryland Cannabis Administration announcements, legislative changes, and industry best practice updates
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Student Feedback Integration</h3>
              <p className="text-muted-foreground">
                Continuous improvement based on student performance data, feedback surveys, and pass rate analysis to ensure curriculum effectiveness
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Download & Contact Section */}
        <Card className="bg-gradient-to-br from-primary to-accent text-white">
          <CardHeader>
            <CardTitle className="text-white">Download Complete Documentation</CardTitle>
            <CardDescription className="text-white/90">
              Access the full MCA compliance package or contact our regulatory team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="secondary" size="lg" className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Download MCA Compliance Package (PDF)
            </Button>
            <div className="border-t border-white/20 pt-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                Contact for Regulatory Inquiries
              </h3>
              <p className="text-white/90 mb-4">
                For questions about compliance, curriculum alignment, or platform security, our regulatory team is available to assist MCA officials.
              </p>
              <Button variant="secondary" size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Email: compliance@procannedu.com
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Back to Homepage
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MCAComplianceReview;
