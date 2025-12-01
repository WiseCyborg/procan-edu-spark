import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const UATAccountCreator = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    accountType: 'employee' as 'manager' | 'employee' | 'coordinator',
    email: '',
    password: 'ProCann2024!',
    firstName: 'UAT',
    lastName: '',
    organizationId: '',
    notes: ''
  });

  // Fetch organizations for dropdown
  const { data: organizations } = useQuery({
    queryKey: ['organizations-for-uat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('admin_approved', true)
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const { data, error } = await supabase.functions.invoke('create-uat-account', {
        body: payload
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`UAT ${formData.accountType} account created: ${data.email}`);
      queryClient.invalidateQueries({ queryKey: ['uat-accounts'] });
      // Reset form
      setFormData({
        accountType: 'employee',
        email: '',
        password: 'ProCann2024!',
        firstName: 'UAT',
        lastName: '',
        organizationId: '',
        notes: ''
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to create UAT account: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.accountType) {
      toast.error('Email and account type are required');
      return;
    }

    createMutation.mutate(formData);
  };

  const quickCreate = (type: 'manager' | 'employee') => {
    const timestamp = Date.now().toString().slice(-6);
    const email = `uat-${type}-${timestamp}@test.com`;
    
    createMutation.mutate({
      accountType: type,
      email,
      password: 'ProCann2024!',
      firstName: 'UAT',
      lastName: type.charAt(0).toUpperCase() + type.slice(1),
      organizationId: organizations?.[0]?.id || '',
      notes: `Quick-created UAT ${type} account`
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Create Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => quickCreate('manager')}
          disabled={createMutation.isPending || !organizations?.length}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Quick Create Manager
        </Button>
        <Button
          onClick={() => quickCreate('employee')}
          disabled={createMutation.isPending || !organizations?.length}
          variant="secondary"
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Quick Create Employee
        </Button>
      </div>

      {!organizations?.length && (
        <p className="text-sm text-muted-foreground text-center">
          No organizations available. Create an organization first.
        </p>
      )}

      {/* Detailed Create Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type *</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value: any) => setFormData({ ...formData, accountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Dispensary Manager</SelectItem>
                    <SelectItem value="coordinator">Training Coordinator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="UAT"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Manager"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="uat-test@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="ProCann2024!"
              />
              <p className="text-xs text-muted-foreground">
                Default password: ProCann2024! (change if needed)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Testing password reset flow..."
                rows={3}
              />
            </div>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating UAT Account...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create UAT Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
