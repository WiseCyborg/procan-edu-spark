import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function EmailDomainVerification() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  const domain = 'procannedu.com';
  
  const dnsRecords = [
    {
      type: 'TXT',
      name: '@',
      value: 'resend-verification=<YOUR_VERIFICATION_CODE>',
      purpose: 'Domain Ownership Verification'
    },
    {
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:_spf.resend.com ~all',
      purpose: 'SPF - Sender Policy Framework'
    },
    {
      type: 'CNAME',
      name: 'resend._domainkey',
      value: '<YOUR_DKIM_VALUE>.resend.com',
      purpose: 'DKIM - Email Signing'
    },
    {
      type: 'TXT',
      name: '_dmarc',
      value: 'v=DMARC1; p=none; rua=mailto:dmarc@procannedu.com',
      purpose: 'DMARC - Email Authentication Policy'
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'DNS record copied to clipboard',
    });
  };

  // The live email diagnostic is retired: this page never sends a test email.
  // Domain/DNS verification state must come from a real provider check.


  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Email Domain Verification</h1>
        <p className="text-muted-foreground">
          Reference for verifying {domain} with Resend
        </p>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Verification telemetry unavailable</AlertTitle>
        <AlertDescription>
          We have no live provider or DNS evidence for {domain}, so this page cannot state whether
          the domain is verified. Provider acceptance IDs returned by Resend only prove the API
          accepted a send request — they do not prove DNS/domain verification or that a message was
          delivered to an inbox.
        </AlertDescription>
      </Alert>

      {/* Current Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Domain:</span>
              <code className="px-2 py-1 bg-muted rounded">{domain}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Verification Status:</span>
              <Badge variant="outline">Unknown — telemetry unavailable</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Email Provider:</span>
              <span>Resend</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Delivery evidence:</span>
              <span className="text-muted-foreground">Not instrumented</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            The live email diagnostic is retired; this page does not send test emails. Confirm
            domain status directly in the Resend dashboard.
          </p>
        </CardContent>
      </Card>


      {/* Step-by-Step Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Access Resend Dashboard</CardTitle>
          <CardDescription>Log in to Resend and navigate to domains</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3">
            <li>
              <a 
                href="https://resend.com/domains" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Go to Resend Domains
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Log in with your Resend account</li>
            <li>Click "Add Domain" if {domain} is not listed</li>
            <li>Enter <code className="px-2 py-1 bg-muted rounded">{domain}</code></li>
            <li>Resend will show you DNS records to add</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Add DNS Records to GoDaddy</CardTitle>
          <CardDescription>Copy these DNS records and add them to your domain registrar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> The exact values will be shown in your Resend dashboard. 
                Use those values, not the placeholders below.
              </AlertDescription>
            </Alert>

            {dnsRecords.map((record, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">{record.type}</Badge>
                    <p className="font-medium">{record.purpose}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(record.value)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-mono">{record.type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-mono">{record.name}</p>
                  </div>
                  <div className="col-span-3">
                    <span className="text-muted-foreground">Value:</span>
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded">{record.value}</p>
                  </div>
                </div>
              </div>
            ))}

            <Alert className="mt-4">
              <AlertTitle>How to Add DNS Records in GoDaddy:</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-2 mt-2">
                  <li>
                    <a 
                      href="https://dcc.godaddy.com/control/portfolio/dns" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Go to GoDaddy DNS Management
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Find {domain} in your domain list</li>
                  <li>Click "DNS" or "Manage DNS"</li>
                  <li>Scroll to "Records" section</li>
                  <li>Click "Add" for each record type</li>
                  <li>Copy the Type, Name, and Value from Resend dashboard</li>
                  <li>Set TTL to 600 (10 minutes) or default</li>
                  <li>Click "Save" for each record</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 3: Wait for DNS Propagation</CardTitle>
          <CardDescription>DNS changes can take time to propagate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Minimum:</strong> 5-10 minutes</li>
                <li><strong>Typical:</strong> 15-30 minutes</li>
                <li><strong>Maximum:</strong> 24-48 hours (rare)</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="font-medium">Check DNS Propagation:</p>
            <a 
              href={`https://dnschecker.org/#TXT/${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Check on DNSChecker.org
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 4: Verify in Resend</CardTitle>
          <CardDescription>Complete verification in Resend dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3">
            <li>Return to Resend Domains page</li>
            <li>Click "Verify" button next to {domain}</li>
            <li>Wait for Resend to check DNS records</li>
            <li>Once verified, status will show <Badge variant="default">Verified ✓</Badge></li>
          </ol>

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Delivery is not proven by verification</AlertTitle>
            <AlertDescription>
              After provider verification, confirm delivery through instrumented delivery events; do
              not infer delivery from API acceptance.
            </AlertDescription>
          </Alert>

        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mt-6 flex gap-4 flex-wrap">
        <Button variant="outline" asChild>
          <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 me-2" />
            Open Resend
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://dcc.godaddy.com/control/portfolio/dns" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 me-2" />
            Open GoDaddy DNS
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={`https://dnschecker.org/#TXT/${domain}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 me-2" />
            Check DNS
          </a>
        </Button>
      </div>
    </div>
  );
}
