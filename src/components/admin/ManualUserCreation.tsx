import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { SensitiveOperationWrapper } from '@/components/auth/SensitiveOperationWrapper';

interface Organization {
  id: string;
  name: string;
}

export const ManualUserCreation: React.FC = () => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'student' | 'dispensary_manager' | 'training_coordinator' | 'admin'>('student');
  const [organizationId, setOrganizationId] = useState('');
  const [password, setPassword] = useState('');
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('admin_approved', true)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const executeCreateUser = async () => {
    if (!email || !firstName || !lastName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (role !== 'admin' && !organizationId) {
      toast({
        title: "Error",
        description: "Please select an organization for non-admin users",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const userPassword = autoGeneratePassword ? generatePassword() : password;

      // Create user via edge function (which uses service role)
      const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password: userPassword,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (createError) throw createError;

      const userId = createData.user.id;

      // Update profile with phone and organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: phone || null,
          organization_id: role !== 'admin' ? organizationId : null,
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase.rpc('manage_user_role', {
        target_user_id: userId,
        new_role: role,
        action: 'add'
      });

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: `User created successfully. ${autoGeneratePassword ? `Password: ${userPassword}` : ''}`,
        duration: 10000,
      });

      // Reset form
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setRole('student');
      setOrganizationId('');
      setPassword('');
      setAutoGeneratePassword(true);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Create New User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger id="role">
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
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          {role !== 'admin' && (
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger id="organization">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-4">
              <Label>Password</Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoGeneratePassword}
                  onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                  className="rounded"
                />
                Auto-generate secure password
              </label>
            </div>
            {!autoGeneratePassword && (
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 6 characters)"
              />
            )}
          </div>

          <div className="md:col-span-2">
            <SensitiveOperationWrapper
              operation="user_creation"
              operationDescription={`Creating new ${role} user: ${email}`}
              onExecute={executeCreateUser}
              urgency="high"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </SensitiveOperationWrapper>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
