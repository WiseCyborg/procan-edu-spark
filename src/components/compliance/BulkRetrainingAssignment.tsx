import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Users, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BulkRetrainingAssignmentProps {
  organizationId: string;
}

interface Module {
  id: string;
  title: string;
  module_number: number;
}

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export const BulkRetrainingAssignment: React.FC<BulkRetrainingAssignmentProps> = ({
  organizationId
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch modules
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['course-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('id, title, module_number')
        .eq('is_active', true)
        .order('module_number');
      
      if (error) throw error;
      return data as Module[];
    },
  });

  // Fetch employees
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['organization-employees-bulk', organizationId],
    queryFn: async () => {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .rpc('get_organization_employees', { org_id: organizationId });
      
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!organizationId,
  });

  const filteredEmployees = employees?.filter((emp) => {
    if (!searchTerm) return true;
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredEmployees) {
      setSelectedEmployees(filteredEmployees.map(e => e.user_id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleToggleEmployee = (userId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedModule) {
      toast.error('Please select a module');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for retraining');
      return;
    }
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-assign-retraining', {
        body: {
          organization_id: organizationId,
          module_id: selectedModule,
          employee_user_ids: selectedEmployees,
          reason: reason.trim(),
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Retraining assigned to ${data.assigned_count} employees`, {
          description: `${data.signoffs_invalidated} signoffs were invalidated`,
        });
        // Reset form
        setSelectedModule('');
        setReason('');
        setSelectedEmployees([]);
      } else {
        throw new Error(data?.error || 'Assignment failed');
      }
    } catch (error: any) {
      console.error('Bulk retraining error:', error);
      toast.error(`Failed to assign retraining: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = modulesLoading || employeesLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Bulk Retraining Assignment
        </CardTitle>
        <CardDescription>
          Assign retraining to multiple employees. This will automatically invalidate their existing signoffs for the selected module.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Module Selection */}
        <div className="space-y-2">
          <Label>Training Module</Label>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger>
              <SelectValue placeholder="Select a module..." />
            </SelectTrigger>
            <SelectContent>
              {modules?.map((module) => (
                <SelectItem key={module.id} value={module.id}>
                  Module {module.module_number}: {module.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label>Reason for Retraining</Label>
          <Textarea
            placeholder="e.g., Compliance incident, regulatory update, performance concern..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {/* Employee Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Select Employees</Label>
            <Badge variant="secondary">
              {selectedEmployees.length} selected
            </Badge>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Checkbox
              checked={filteredEmployees?.length === selectedEmployees.length && selectedEmployees.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <Label className="cursor-pointer">Select All ({filteredEmployees?.length || 0})</Label>
          </div>

          {/* Employee List */}
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmployees?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No employees found
              </div>
            ) : (
              filteredEmployees?.map((emp) => (
                <div 
                  key={emp.user_id}
                  className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedEmployees.includes(emp.user_id)}
                    onCheckedChange={() => handleToggleEmployee(emp.user_id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {emp.email}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !selectedModule || !reason.trim() || selectedEmployees.length === 0}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Assign Retraining to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
