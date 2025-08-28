import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  UserPlus, 
  Key, 
  Mail, 
  CreditCard,
  Users,
  CheckCircle
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  unique_access_key: string;
  course_credits: number;
  payment_status: string;
  admin_approved: boolean;
  is_active: boolean;
  contact_email: string;
  contact_person: string;
  created_at: string;
}

const DispensaryManagerSetup = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingManager, setIsCreatingManager] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerName, setManagerName] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('payment_status', 'paid')
        .eq('admin_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error",
        description: "Failed to load organizations.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDispensaryManager = async (organization: Organization) => {
    if (!managerEmail || !managerPassword || !managerName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all manager details.",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingManager(true);
    try {
      // Create the manager user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: managerEmail,
        password: managerPassword,
        email_confirm: true,
        user_metadata: {
          first_name: managerName.split(' ')[0] || managerName,
          last_name: managerName.split(' ').slice(1).join(' ') || '',
          role: 'dispensary_manager'
        }
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      // Create profile for the manager
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          first_name: managerName.split(' ')[0] || managerName,
          last_name: managerName.split(' ').slice(1).join(' ') || '',
          organization_id: organization.id,
          organization: organization.name
        });

      if (profileError) throw profileError;

      // Assign dispensary manager role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'dispensary_manager'
        });

      if (roleError) throw roleError;

      // Send welcome email to the manager
      try {
        await supabase.functions.invoke('send-branded-email', {
          body: {
            to: managerEmail,
            emailType: 'dispensary-manager-welcome',
            data: {
              managerName,
              organizationName: organization.name,
              accessKey: organization.unique_access_key,
              credits: organization.course_credits,
              loginUrl: `${window.location.origin}/auth?role=dispensary`
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }

      toast({
        title: "Manager Created",
        description: `Dispensary manager account created successfully for ${organization.name}.`,
      });

      // Clear form
      setManagerEmail('');
      setManagerPassword('');
      setManagerName('');
      setSelectedOrg(null);

    } catch (error) {
      console.error('Error creating dispensary manager:', error);
      toast({
        title: "Error",
        description: "Failed to create dispensary manager account.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingManager(false);
    }
  };

  const getStatusBadge = (org: Organization) => {
    if (org.is_active && org.admin_approved && org.payment_status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    return <Badge variant="outline">Setup Required</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-700 flex items-center">
            <Building2 className="mr-3 h-6 w-6" />
            Organization Setup
          </h2>
          <p className="text-muted-foreground">Manage organization accounts and dispensary managers</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {organizations.length} Organizations
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {organizations.map((organization) => (
          <Card key={organization.id} className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {organization.name}
                    </h3>
                    {getStatusBadge(organization)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <span className="font-mono">{organization.unique_access_key}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>{organization.course_credits} training credits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{organization.contact_email}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    Created: {new Date(organization.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrg(organization);
                          setManagerEmail(organization.contact_email);
                          setManagerName(organization.contact_person || '');
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Setup Manager
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Dispensary Manager</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                          <h4 className="font-medium text-blue-800 mb-1">Organization</h4>
                          <p className="text-sm text-blue-700">{organization.name}</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Access Key: {organization.unique_access_key}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="manager-name">Manager Name</Label>
                          <Input
                            id="manager-name"
                            value={managerName}
                            onChange={(e) => setManagerName(e.target.value)}
                            placeholder="Full name of dispensary manager"
                          />
                        </div>

                        <div>
                          <Label htmlFor="manager-email">Manager Email</Label>
                          <Input
                            id="manager-email"
                            type="email"
                            value={managerEmail}
                            onChange={(e) => setManagerEmail(e.target.value)}
                            placeholder="manager@dispensary.com"
                          />
                        </div>

                        <div>
                          <Label htmlFor="manager-password">Temporary Password</Label>
                          <Input
                            id="manager-password"
                            type="password"
                            value={managerPassword}
                            onChange={(e) => setManagerPassword(e.target.value)}
                            placeholder="Create a temporary password"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Manager will be able to change this after first login
                          </p>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-xs text-amber-800">
                            The manager will receive a welcome email with login instructions and organization details.
                          </p>
                        </div>

                        <Button
                          onClick={() => createDispensaryManager(organization)}
                          disabled={isCreatingManager}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {isCreatingManager ? (
                            'Creating Manager...'
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Create Manager Account
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Organizations Found</h3>
            <p className="text-muted-foreground">
              Organizations will appear here after payment completion.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DispensaryManagerSetup;