import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { Building2, Plus } from 'lucide-react';

const TestOrganizationCreator = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [credits, setCredits] = useState(10);
  const { performSecurityCheck } = useSecurityMonitoring();

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
        toast({
          title: "Test Organization Created",
          description: `"${orgName}" created successfully with access key: ${result.access_key}`,
        });
        
        // Reset form
        setOrgName('');
        setContactEmail('');
        setCredits(10);
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

  return (
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
  );
};

export default TestOrganizationCreator;