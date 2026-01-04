import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserPlus, Loader2, Mail } from 'lucide-react';

interface AssignCoordinatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  employees?: Array<{
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
  onAssigned?: () => void;
}

export function AssignCoordinatorDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  employees = [],
  onAssigned,
}: AssignCoordinatorDialogProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'existing' | 'invite'>('existing');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!user) return;

    const email = mode === 'existing' 
      ? employees.find(e => e.user_id === selectedEmployee)?.email 
      : inviteEmail.trim().toLowerCase();

    if (!email) {
      toast.error('Please select an employee or enter an email');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('assign-training-coordinator', {
        body: {
          organization_id: organizationId,
          user_email: email,
          assigned_by: user.id,
        },
      });

      if (error) throw error;

      toast.success('Training coordinator assigned', {
        description: mode === 'existing' 
          ? 'Role has been granted to the employee'
          : `Invitation sent to ${email}`,
      });

      setSelectedEmployee('');
      setInviteEmail('');
      onOpenChange(false);
      onAssigned?.();
    } catch (error: any) {
      console.error('Error assigning coordinator:', error);
      toast.error('Failed to assign coordinator', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Training Coordinator
          </DialogTitle>
          <DialogDescription>
            Assign a training coordinator for {organizationName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'existing' | 'invite')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Promote Employee</TabsTrigger>
            <TabsTrigger value="invite">Invite New</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Employee to Promote</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <SelectItem value="" disabled>
                      No employees available
                    </SelectItem>
                  ) : (
                    employees.map((emp) => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>
                        {emp.first_name} {emp.last_name} ({emp.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The employee will receive the training coordinator role immediately
              </p>
            </div>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="coordinator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                An invitation email will be sent to this address
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || (mode === 'existing' ? !selectedEmployee : !inviteEmail.trim())}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'existing' ? 'Assigning...' : 'Sending...'}
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {mode === 'existing' ? 'Assign Role' : 'Send Invitation'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
