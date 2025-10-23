import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Trash2, Copy, Users, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type UserRole = 'student' | 'dispensary_manager' | 'training_coordinator' | 'admin';

interface TestProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  organization_id?: string;
  organization_name?: string;
  job_title?: string;
}

interface Organization {
  id: string;
  name: string;
}

const UAT_TEST_ACCOUNTS = [
  {
    email: 'admin@procannedu.com',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin' as UserRole,
    organizationId: null,
    jobTitle: 'System Admin'
  },
  {
    email: 'manager@demo-dispensary.com',
    firstName: 'Demo',
    lastName: 'Manager',
    role: 'dispensary_manager' as UserRole,
    organizationId: '18bfd997-06bb-454e-823d-4923845f640c',
    jobTitle: 'Dispensary Manager'
  },
  {
    email: 'coordinator@demo-dispensary.com',
    firstName: 'Training',
    lastName: 'Coordinator',
    role: 'training_coordinator' as UserRole,
    organizationId: '18bfd997-06bb-454e-823d-4923845f640c',
    jobTitle: 'Training Coordinator'
  },
  {
    email: 'employee@demo-dispensary.com',
    firstName: 'Demo',
    lastName: 'Employee',
    role: 'student' as UserRole,
    organizationId: '18bfd997-06bb-454e-823d-4923845f640c',
    jobTitle: 'Dispensary Associate'
  }
];

export const TestProfileCreator = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [testProfiles, setTestProfiles] = useState<TestProfile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'student' as UserRole,
    organizationId: '',
    jobTitle: ''
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching organizations:', error);
      return;
    }

    setOrganizations(data || []);
  };

  const createTestProfile = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      const fakeUserId = crypto.randomUUID();

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: fakeUserId,
          email_cache: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          organization_id: formData.organizationId || null,
          job_title: formData.jobTitle || null
        });

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: fakeUserId,
          role: formData.role
        });

      if (roleError) {
        await supabase.from('profiles').delete().eq('user_id', fakeUserId);
        throw roleError;
      }

      const orgName = organizations.find(o => o.id === formData.organizationId)?.name;

      const newProfile: TestProfile = {
        user_id: fakeUserId,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        organization_id: formData.organizationId || undefined,
        organization_name: orgName,
        job_title: formData.jobTitle || undefined
      };

      setTestProfiles([...testProfiles, newProfile]);

      toast({
        title: "Test Profile Created",
        description: `Created test user: ${formData.email} (${formData.role})`,
      });

      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'student',
        organizationId: '',
        jobTitle: ''
      });

    } catch (error: any) {
      console.error('Error creating test profile:', error);
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const createUATTestSuite = async () => {
    setIsCreating(true);
    const createdProfiles: TestProfile[] = [];

    for (const account of UAT_TEST_ACCOUNTS) {
      try {
        const fakeUserId = crypto.randomUUID();

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: fakeUserId,
            email_cache: account.email,
            first_name: account.firstName,
            last_name: account.lastName,
            organization_id: account.organizationId,
            job_title: account.jobTitle,
          });

        if (profileError) {
          console.error(`Profile creation failed for ${account.email}:`, profileError);
          continue;
        }

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: fakeUserId,
            role: account.role,
          });

        if (roleError) {
          console.error(`Role assignment failed for ${account.email}:`, roleError);
          await supabase.from('profiles').delete().eq('user_id', fakeUserId);
          continue;
        }

        const orgName = organizations.find(o => o.id === account.organizationId)?.name;

        createdProfiles.push({
          user_id: fakeUserId,
          email: account.email,
          first_name: account.firstName,
          last_name: account.lastName,
          role: account.role,
          organization_id: account.organizationId || undefined,
          organization_name: orgName,
          job_title: account.jobTitle,
        });
      } catch (error) {
        console.error(`Failed to create ${account.email}:`, error);
      }
    }

    setTestProfiles([...testProfiles, ...createdProfiles]);
    setIsCreating(false);

    toast({
      title: "UAT Test Suite Created",
      description: `Successfully created ${createdProfiles.length} of ${UAT_TEST_ACCOUNTS.length} test accounts`,
    });
  };

  const exportCredentials = () => {
    const credentials = testProfiles.map(p => ({
      Email: p.email,
      Name: `${p.first_name} ${p.last_name}`,
      Role: p.role,
      Organization: p.organization_name || 'N/A',
      'Job Title': p.job_title || 'N/A',
      'User ID': p.user_id,
      Note: 'Cannot login - UAT testing only'
    }));

    const csv = [
      Object.keys(credentials[0]).join(','),
      ...credentials.map(c => Object.values(c).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uat-test-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Credentials Exported",
      description: "UAT test credentials downloaded as CSV",
    });
  };

  const deleteTestProfile = async (userId: string, email: string) => {
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
      
      if (error) throw error;

      setTestProfiles(testProfiles.filter(p => p.user_id !== userId));

      toast({
        title: "Test Profile Deleted",
        description: `Removed: ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const copyUserId = (userId: string) => {
    navigator.clipboard.writeText(userId);
    toast({
      title: "Copied",
      description: "User ID copied to clipboard",
    });
  };

  const clearAllTestProfiles = async () => {
    if (!confirm(`Delete all ${testProfiles.length} test profiles?`)) return;

    for (const profile of testProfiles) {
      await deleteTestProfile(profile.user_id, profile.email);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle>Test Profile Creator</CardTitle>
            <CardDescription>
              Create test users for UAT testing (bypasses auth.users RLS issue). 
              These users cannot login but appear in admin management UI.
            </CardDescription>
          </div>
          {testProfiles.length > 0 && (
            <Button 
              onClick={exportCredentials} 
              variant="outline"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Batch Creation Button */}
        <div className="space-y-2">
          <Button 
            onClick={createUATTestSuite} 
            disabled={isCreating}
            variant="secondary"
            className="w-full"
          >
            <Users className="mr-2 h-4 w-4" />
            {isCreating ? 'Creating...' : 'Create Complete UAT Test Suite (4 Accounts)'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Creates: Admin, Manager, Coordinator, and Employee test accounts for Demo Dispensary
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or create individual test user</span>
          </div>
        </div>

        {/* Creation Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="test@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="dispensary_manager">Dispensary Manager</SelectItem>
                  <SelectItem value="training_coordinator">Training Coordinator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization (Optional)</Label>
              <Select 
                value={formData.organizationId} 
                onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (for admins)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title (Optional)</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="e.g., Dispensary Associate"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={createTestProfile} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Test Profile
                </>
              )}
            </Button>

            {testProfiles.length > 0 && (
              <Button onClick={clearAllTestProfiles} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All ({testProfiles.length})
              </Button>
            )}
          </div>
        </div>

        {/* Created Profiles Table */}
        {testProfiles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Created Test Profiles</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testProfiles.map((profile) => (
                  <TableRow key={profile.user_id}>
                    <TableCell>{profile.first_name} {profile.last_name}</TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{profile.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{profile.organization_name || 'N/A'}</TableCell>
                    <TableCell className="text-sm">{profile.job_title || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyUserId(profile.user_id)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {profile.user_id.slice(0, 8)}...
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTestProfile(profile.user_id, profile.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};