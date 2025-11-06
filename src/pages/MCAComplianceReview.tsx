import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, FileText, Lock, Users, CheckCircle, Download, Mail } from 'lucide-react';
import { ComplianceDisclaimer } from '@/components/ComplianceDisclaimer';

const MCAComplianceReview = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Shield className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              MCA Compliance Documentation
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive compliance information for Maryland Cannabis Administration officials reviewing ProCann Edu's RVT training platform
          </p>
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
              COMAR 14.17.05 Alignment Matrix
            </CardTitle>
            <CardDescription>
              Module-by-module mapping to Maryland regulations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Our 23-module curriculum is specifically designed to meet and exceed COMAR 14.17.05 requirements for Responsible Vendor Training in Maryland.
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Data Substantiation & Methodology
            </CardTitle>
            <CardDescription>
              Supporting documentation for platform claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ComplianceDisclaimer />
          </CardContent>
        </Card>

        {/* Platform Security & Accessibility */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-purple-600" />
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
                Monthly monitoring of regulatory changes with immediate content updates when MCA issues new guidance or revisions to COMAR 14.17.05
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
                <Mail className="h-4 w-4 mr-2" />
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
