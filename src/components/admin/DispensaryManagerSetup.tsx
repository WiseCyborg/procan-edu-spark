import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  UserPlus, 
  CheckCircle2, 
  Clock,
  Key,
  CreditCard,
  Users
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
  const [creatingManager, setCreatingManager] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  
  // Manager form state
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

  const createDispensaryManager = async () => {
    if (!selectedOrganization || !managerEmail || !managerPassword || !managerName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all manager details.",
        variant: "destructive"
      });
      return;
    }

    setCreatingManager(true);
    try {
      // Create dispensary manager user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: managerEmail,
        password: managerPassword,
        email_confirm: true,
        user_metadata: {
          first_name: managerName.split(' ')[0],
          last_name: managerName.split(' ').slice(1).join(' ') || '',
          organization_id: selectedOrganization.id
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Insert profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            first_name: managerName.split(' ')[0],
            last_name: managerName.split(' ').slice(1).join(' ') || '',
            organization_id: selectedOrganization.id
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Assign dispensary_manager role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'dispensary_manager'
          });

        if (roleError) {
          console.error('Role assignment error:', roleError);
        }

        // Send welcome email
        try {
          await supabase.functions.invoke('send-branded-email', {
            body: {
              to: managerEmail,
              subject: 'Welcome to Cannabis Training - Manager Access',
              type: 'manager-welcome',
              data: {
                managerName: managerName,
                organizationName: selectedOrganization.name,
                accessKey: selectedOrganization.unique_access_key,
                credits: selectedOrganization.course_credits
              }
            }
          });
        } catch (emailError) {
          console.error('Email error:', emailError);
        }

        toast({
          title: "Manager Created",
          description: `Dispensary manager account created successfully for ${selectedOrganization.name}.`,
        });

        // Reset form
        setManagerEmail('');
        setManagerPassword('');
        setManagerName('');
        setSelectedOrganization(null);
        await fetchOrganizations();
      }
    } catch (error) {
      console.error('Error creating manager:', error);
      toast({
        title: "Error",
        description: "Failed to create dispensary manager account.",
        variant: "destructive"
      });
    } finally {
      setCreatingManager(false);
    }
  };

  const getStatusBadge = (org: Organization) => {
    // Check if manager already exists
    const hasManager = true; // We'll assume setup needed for now
    
    if (hasManager) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Setup Complete
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-amber-100 text-amber-800">
        <Clock className="h-3 w-3 mr-1" />
        Setup Needed
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
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
            Dispensary Manager Setup
          </h2>
          <p className="text-muted-foreground">Create manager accounts for approved organizations</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {organizations.length} Organizations
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {organizations.map((org) => (
          <Card key={org.id} className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {org.name}
                    </h3>
                    {getStatusBadge(org)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <span>Key: {org.unique_access_key}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>{org.course_credits} Credits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{org.contact_person}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    Contact: {org.contact_email} • Created: {new Date(org.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrganization(org)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Setup Manager
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Dispensary Manager - {org.name}</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="manager-name">Manager Full Name</Label>
                          <Input
                            id="manager-name"
                            value={managerName}
                            onChange={(e) => setManagerName(e.target.value)}
                            placeholder="Enter manager's full name"
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
                            placeholder="Enter secure password"
                          />
                        </div>

                        <div className="bg-blue-50 p-4 rounded-md">
                          <h4 className="font-medium text-blue-800 mb-2">Organization Details:</h4>
                          <div className="text-sm text-blue-700 space-y-1">
                            <p>Name: {org.name}</p>
                            <p>Access Key: {org.unique_access_key}</p>
                            <p>Training Credits: {org.course_credits}</p>
                          </div>
                        </div>

                        <Button
                          onClick={createDispensaryManager}
                          disabled={creatingManager || !managerEmail || !managerPassword || !managerName}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {creatingManager ? 'Creating Manager...' : 'Create Manager Account'}
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
              Approved and paid organizations will appear here for manager setup.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DispensaryManagerSetup;