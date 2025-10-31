import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { Building2, Plus, Copy, CheckCircle2, Key, Link2, Hash } from 'lucide-react';

interface CreatedOrgData {
  organization_id: string;
  access_key: string;
  join_code: string;
  registration_token: string;
  registration_url: string;
}

const TestOrganizationCreator = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [credits, setCredits] = useState(10);
  const [createdOrg, setCreatedOrg] = useState<CreatedOrgData | null>(null);
  const { performSecurityCheck } = useSecurityMonitoring();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const createTestOrganization = async () => {
    if (!orgName.trim() || !contactEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Organization name and contact email are required.",
        variant: "destructive"
      });
      return;
    }

    if (!await performSecurityCheck('test_org_creation')) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_test_organization', {
        org_name: orgName.trim(),
        contact_email: contactEmail.trim(),
        credits: credits
      });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        setCreatedOrg({
          organization_id: result.organization_id,
          access_key: result.access_key,
          join_code: result.join_code,
          registration_token: result.registration_token,
          registration_url: result.registration_url
        });
        
        toast({
          title: "Test Organization Created",
          description: `"${orgName}" created successfully with ${credits} seats`,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating test organization:', error);
      toast({
        title: "Error",
        description: "Failed to create test organization",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Reset and start over
  const startOver = () => {
    setCreatedOrg(null);
    setOrgName('');
    setContactEmail('');
    setCredits(10);
  };

  return (
    <>
      {!createdOrg ? (
        <Card className="border-dashed border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-primary">
              <Building2 className="h-5 w-5 mr-2" />
              Create Test Organization
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create test organizations directly for system testing (bypasses payment workflow)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Test Dispensary Inc."
                />
              </div>
              <div>
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <Label htmlFor="credits">Training Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  min="1"
                  max="100"
                  value={credits}
                  onChange={(e) => setCredits(parseInt(e.target.value) || 10)}
                />
              </div>
            </div>
            
            <Button
              onClick={createTestOrganization}
              disabled={isCreating || !orgName.trim() || !contactEmail.trim()}
              className="w-full md:w-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              {isCreating ? 'Creating...' : 'Create Test Organization'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-6 w-6 mr-2" />
              Test Organization Created Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Organization created with {credits} training seats allocated. All credentials are below:
              </AlertDescription>
            </Alert>

            {/* Manager Registration Link */}
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">Manager Registration Link</Label>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(createdOrg.registration_url, 'Registration link')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <code className="text-xs break-all block bg-muted p-2 rounded">
                {createdOrg.registration_url}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                ⏰ Expires in 7 days - Send this to the manager to create their account
              </p>
            </div>

            {/* Access Key */}
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-600" />
                  <Label className="text-sm font-semibold">Organization Access Key</Label>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(createdOrg.access_key, 'Access key')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="font-mono text-2xl font-bold text-amber-700 dark:text-amber-400">
                {createdOrg.access_key}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                🔐 Keep this secure - needed for manager registration
              </p>
            </div>

            {/* Join Code */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-semibold">Employee Join Code</Label>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(createdOrg.join_code, 'Join code')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-400">
                {createdOrg.join_code}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                👥 Share this with employees to join the organization
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={startOver} variant="outline" className="flex-1">
                Create Another Test Organization
              </Button>
              <Button
                onClick={() => window.open(createdOrg.registration_url, '_blank')}
                className="flex-1"
              >
                Open Registration Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default TestOrganizationCreator;