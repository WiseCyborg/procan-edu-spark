import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Search, Upload, Code, HelpCircle, Mail, Download } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function EmployersPage() {
  const navigate = useNavigate();
  const [certNumber, setCertNumber] = useState('');

  const handleVerify = () => {
    if (certNumber) {
      navigate(`/verify-certificate?cert=${certNumber}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      {/* Hero */}
      <div className="text-center mb-12">
        <Badge className="mb-4 text-lg px-4 py-2">
          <Building2 className="h-5 w-5 mr-2" />
          For Employers
        </Badge>
        <h1 className="text-4xl font-bold mb-4">
          Employer Certificate Verification
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Verify Employee Cannabis Training Credentials
        </p>
      </div>

      {/* Single Certificate Verification */}
      <Card className="mb-8 border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Verify a Single Certificate
          </CardTitle>
          <p className="text-sm text-muted-foreground">Enter a certificate number to verify its status</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter certificate number (e.g., CERT-2025-001-1234)"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
              className="flex-1"
            />
            <Button onClick={handleVerify} disabled={!certNumber}>
              <Shield className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Certificate numbers can be found on the employee's training certificate or digital credential
          </p>
        </CardContent>
      </Card>

      {/* Bulk Verification */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" />
            Bulk Certificate Verification
          </CardTitle>
          <p className="text-sm text-muted-foreground">Verify up to 100 certificates at once</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed rounded-lg text-center">
              <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold mb-1">Upload CSV File</p>
              <p className="text-sm text-muted-foreground mb-3">
                Upload a CSV file with certificate numbers (one per line)
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample CSV
                </Button>
                <Button size="sm">
                  Choose File
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: One certificate number per row. Maximum 100 certificates per upload.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            API Integration for HR Systems
          </CardTitle>
          <p className="text-sm text-muted-foreground">Integrate verification into your existing systems</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">REST Endpoint</h4>
              <div className="bg-muted p-3 rounded font-mono text-sm">
                GET https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/bulk-verify-certificates
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Authentication</h4>
              <p className="text-sm text-muted-foreground">
                API key required. Contact <a href="mailto:api@procannedu.com" className="text-primary hover:underline">api@procannedu.com</a> for access.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Request Example (JSON)</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "certificate_numbers": [
    "CERT-2025-001-1234",
    "CERT-2025-001-5678"
  ]
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Response Example (JSON)</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "results": [
    {
      "certificate_number": "CERT-2025-001-1234",
      "status": "valid",
      "valid": true,
      "issue_date": "2025-01-15",
      "expiry_date": "2027-01-15",
      "course_title": "Maryland RVT Certification"
    }
  ]
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Rate Limits</h4>
              <p className="text-sm text-muted-foreground">100 requests per hour per API key</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Employer FAQ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I verify a certificate?</AccordionTrigger>
              <AccordionContent>
                Enter the certificate number in the verification form above. The system will immediately 
                show you the certificate's status (valid, expired, or revoked), issue date, and expiry date.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>What if a certificate is expired?</AccordionTrigger>
              <AccordionContent>
                Maryland regulations require regular re-certification. If an employee's certificate is 
                expired, they should re-enroll in the training program. Contact us at{' '}
                <a href="mailto:employers@procannedu.com" className="text-primary hover:underline">
                  employers@procannedu.com
                </a>{' '}
                for bulk re-enrollment options.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>Can I integrate verification into my HR system?</AccordionTrigger>
              <AccordionContent>
                Yes! We offer a REST API for programmatic certificate verification. Contact{' '}
                <a href="mailto:api@procannedu.com" className="text-primary hover:underline">
                  api@procannedu.com
                </a>{' '}
                to request API access and documentation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>Who do I contact for verification issues?</AccordionTrigger>
              <AccordionContent>
                For any verification issues, questions, or bulk verification needs, contact our employer 
                support team at{' '}
                <a href="mailto:employers@procannedu.com" className="text-primary hover:underline">
                  employers@procannedu.com
                </a>. 
                We typically respond within 1 business day.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>Is there a cost for verification?</AccordionTrigger>
              <AccordionContent>
                No. Certificate verification is free for all employers. This service is provided to ensure 
                compliance and protect the integrity of Maryland's cannabis industry.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Form CTA */}
      <Card className="bg-primary text-white">
        <CardContent className="pt-6">
          <div className="text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-2">Need Bulk Verification Assistance?</h3>
            <p className="mb-6 opacity-90">
              Our employer support team can help with large-scale verifications, API integration, 
              and custom reporting.
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => window.location.href = 'mailto:employers@procannedu.com?subject=Bulk Verification Assistance'}
            >
              Contact Employer Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
