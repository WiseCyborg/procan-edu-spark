import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Zap, Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink, Copy, Trash2 } from 'lucide-react';

interface FastTrackResults {
  organization_id: string;
  application_id: string;
  access_info: {
    manager_email: string;
    manager_password: string;
    join_code: string;
    unique_access_key: string;
  };
  emails_sent: Array<{
    type: string;
    to: string;
    status: 'sent' | 'failed' | 'skipped';
  }>;
  employee_ids: string[];
}

export function FastTrackTestPanel() {
  const [testEmail, setTestEmail] = useState('flamevape@gmail.com');
  const [orgName, setOrgName] = useState('Fast Track Test Dispensary');
  const [employeeCount, setEmployeeCount] = useState(2);
  const [autoComplete, setAutoComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FastTrackResults | null>(null);

  const handleFastTrack = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fast-track-dispensary-test', {
        body: {
          test_email: testEmail,
          organization_name: orgName,
          employee_count: employeeCount,
          auto_complete_course: autoComplete
        }
      });

      if (error) throw error;

      setResults(data);
      toast({
        title: "Fast Track Test Complete ✅",
        description: `Test organization created with ${data.employee_ids.length} employees`,
        duration: 10000,
      });
    } catch (error: any) {
      console.error('Fast track test failed:', error);
      toast({
        title: "Fast Track Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", duration: 2000 });
  };

  const cleanupTest = async (orgId: string) => {
    try {
      const { error } = await supabase.functions.invoke('cleanup-fast-track-tests', {
        body: { organization_id: orgId }
      });
      if (error) throw error;
      toast({ title: "Test data cleaned up successfully", duration: 3000 });
      setResults(null);
    } catch (error: any) {
      toast({ title: "Cleanup failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          🚀 Fast Track Dispensary Test
        </CardTitle>
        <CardDescription>
          Instantly create a complete test dispensary with all emails sent (bypasses payment)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <Label>Test Email Address</Label>
          <Input 
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="flamevape@gmail.com"
          />
          <p className="text-sm text-muted-foreground mt-1">
            📧 Employee emails: {testEmail.split('@')[0]}+emp1@{testEmail.split('@')[1]}, 
            {testEmail.split('@')[0]}+emp2@{testEmail.split('@')[1]}
          </p>
        </div>
        
        <div>
          <Label>Organization Name</Label>
          <Input 
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Test Dispensary"
          />
        </div>
        
        <div>
          <Label>Number of Employees</Label>
          <Input 
            type="number"
            value={employeeCount}
            onChange={(e) => setEmployeeCount(parseInt(e.target.value))}
            min={1}
            max={10}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="auto-complete"
            checked={autoComplete}
            onCheckedChange={(checked) => setAutoComplete(checked as boolean)}
          />
          <Label htmlFor="auto-complete">
            Auto-complete course and generate certificates (adds ~30s)
          </Label>
        </div>
        
        <Separator />
        
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <h4 className="font-semibold text-foreground mb-2">📋 What This Test Does:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✅ 1. Creates dispensary application</li>
            <li>✅ 2. Sends application confirmation email</li>
            <li>✅ 3. Auto-approves application</li>
            <li>✅ 4. Sends approval email</li>
            <li>⏭️ 5. Skips payment (creates organization directly)</li>
            <li>✅ 6. Creates manager account</li>
            <li>✅ 7. Sends manager welcome email</li>
            <li>✅ 8. Creates {employeeCount} employee accounts</li>
            <li>✅ 9. Sends employee invitation emails</li>
            {autoComplete && <li>✅ 10. Generates completion certificates</li>}
          </ul>
        </div>
        
        <Button 
          onClick={handleFastTrack}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Test Organization...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              🚀 Create Fast Track Test
            </>
          )}
        </Button>
      </CardContent>

      {results && (
        <CardFooter className="flex-col items-start">
          <Separator className="mb-4" />
          <div className="w-full space-y-4">
            <h3 className="font-semibold text-lg">✅ Test Organization Created Successfully!</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Organization ID</Label>
                <p className="font-mono text-sm">{results.organization_id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Application ID</Label>
                <p className="font-mono text-sm">{results.application_id}</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="font-semibold mb-2 block">🔑 Access Credentials</Label>
              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Manager Email:</span>
                  <p className="font-mono text-sm">{results.access_info.manager_email}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Manager Password:</span>
                  <p className="font-mono text-sm font-bold">{results.access_info.manager_password}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Join Code:</span>
                  <p className="font-mono text-sm">{results.access_info.join_code}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Access Key:</span>
                  <p className="font-mono text-sm">{results.access_info.unique_access_key}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="font-semibold mb-2 block">📧 Emails Sent</Label>
              <div className="space-y-2">
                {results.emails_sent.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {email.status === 'sent' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : email.status === 'skipped' ? (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="capitalize">{email.type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-xs">{email.to}</span>
                    <Badge variant={email.status === 'sent' ? 'default' : 'secondary'}>
                      {email.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/auth?role=dispensary_manager`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Login as Manager
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(results.access_info, null, 2))}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Credentials
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => cleanupTest(results.organization_id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Test Data
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
