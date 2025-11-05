import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Mail, Plus, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function AlertRecipientManager() {
  const [newEmail, setNewEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: recipients, isLoading } = useQuery({
    queryKey: ['alert-recipients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'pipeline_alert_recipients')
        .single();

      if (error) throw error;
      return (data.setting_value as string[]) || [];
    }
  });

  const updateRecipients = useMutation({
    mutationFn: async (newRecipients: string[]) => {
      const { error } = await supabase
        .from('admin_settings')
        .update({ 
          setting_value: newRecipients,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'pipeline_alert_recipients');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-recipients'] });
      toast.success('Alert recipients updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update recipients: ${error.message}`);
    }
  });

  const addRecipient = () => {
    if (!newEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const current = recipients || [];
    if (current.includes(newEmail)) {
      toast.error('This email is already in the list');
      return;
    }

    updateRecipients.mutate([...current, newEmail]);
    setNewEmail('');
  };

  const removeRecipient = (email: string) => {
    const current = recipients || [];
    updateRecipients.mutate(current.filter(e => e !== email));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pipeline Alert Recipients
        </CardTitle>
        <CardDescription>
          Manage who receives critical pipeline failure notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Automated Alerts</p>
            <p className="text-muted-foreground">
              Recipients will receive emails when critical issues are detected: stuck applications (&gt;48h), 
              orphaned organizations, or email delivery failures.
            </p>
          </div>
        </div>

        {/* Add New Recipient */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="admin@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
          />
          <Button 
            onClick={addRecipient}
            disabled={updateRecipients.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Current Recipients */}
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Current Recipients ({recipients?.length || 0})
          </div>
          <div className="space-y-2">
            {recipients && recipients.length > 0 ? (
              recipients.map((email) => (
                <div 
                  key={email} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                    {email === 'admin@procannedu.com' && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRecipient(email)}
                    disabled={updateRecipients.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No recipients configured
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
