import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Trash2, Copy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type UserRole = 'student' | 'dispensary_manager' | 'training_coordinator' | 'admin';

interface TestProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export const TestProfileCreator = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [testProfiles, setTestProfiles] = useState<TestProfile[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'student' as UserRole
  });

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
      // Generate a fake UUID for testing
      const fakeUserId = crypto.randomUUID();

      // Insert into profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: fakeUserId,
          email_cache: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName
        });

      if (profileError) throw profileError;

      // Insert into user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: fakeUserId,
          role: formData.role
        });

      if (roleError) {
        // Rollback: delete profile
        await supabase.from('profiles').delete().eq('user_id', fakeUserId);
        throw roleError;
      }

      const newProfile: TestProfile = {
        user_id: fakeUserId,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role
      };

      setTestProfiles([...testProfiles, newProfile]);

      toast({
        title: "Test Profile Created",
        description: `Created test user: ${formData.email} (${formData.role})`,
      });

      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'student'
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

  const deleteTestProfile = async (userId: string, email: string) => {
    try {
      // Delete from user_roles first (foreign key)
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Delete from profiles
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
        <CardTitle>Test Profile Creator</CardTitle>
        <CardDescription>
          Create test users for UAT testing (bypasses auth.users RLS issue). 
          These users cannot login but appear in admin management UI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Creation Form */}
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
