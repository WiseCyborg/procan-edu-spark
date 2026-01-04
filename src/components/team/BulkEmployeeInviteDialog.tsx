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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Users, Loader2, Upload, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BulkEmployeeInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  onInvited?: () => void;
}

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

export function BulkEmployeeInviteDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  onInvited,
}: BulkEmployeeInviteDialogProps) {
  const { user } = useAuth();
  const [emails, setEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  };

  const handleInvite = async () => {
    if (!user) return;

    const emailList = parseEmails(emails);
    
    if (emailList.length === 0) {
      toast.error('No valid emails found');
      return;
    }

    if (emailList.length > 50) {
      toast.error('Maximum 50 emails per batch');
      return;
    }

    setLoading(true);
    setResults([]);
    setShowResults(false);

    const inviteResults: InviteResult[] = [];

    for (const email of emailList) {
      try {
        const { error } = await supabase.functions.invoke('send-employee-invitation', {
          body: {
            employeeEmail: email,
            organizationId,
            organizationName,
            inviterId: user.id,
          },
        });

        if (error) throw error;

        inviteResults.push({ email, success: true });
      } catch (error: any) {
        inviteResults.push({ 
          email, 
          success: false, 
          error: error.message || 'Failed to send' 
        });
      }
    }

    setResults(inviteResults);
    setShowResults(true);
    setLoading(false);

    const successCount = inviteResults.filter(r => r.success).length;
    const failCount = inviteResults.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`${successCount} invitation(s) sent`, {
        description: failCount > 0 ? `${failCount} failed` : undefined,
      });
      onInvited?.();
    } else {
      toast.error('All invitations failed');
    }
  };

  const handleClose = () => {
    setEmails('');
    setResults([]);
    setShowResults(false);
    onOpenChange(false);
  };

  const parsedCount = parseEmails(emails).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Employee Invitation
          </DialogTitle>
          <DialogDescription>
            Invite multiple employees at once to {organizationName}
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="emails">Email Addresses</Label>
                {parsedCount > 0 && (
                  <Badge variant="secondary">{parsedCount} emails detected</Badge>
                )}
              </div>
              <Textarea
                id="emails"
                placeholder="Enter email addresses separated by commas, semicolons, or new lines:&#10;&#10;employee1@example.com&#10;employee2@example.com&#10;employee3@example.com"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Maximum 50 emails per batch. Each recipient will receive an invitation email.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {results.filter(r => r.success).length} Sent
              </Badge>
              {results.filter(r => !r.success).length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {results.filter(r => !r.success).length} Failed
                </Badge>
              )}
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                    result.success ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
                  }`}
                >
                  <span className="font-mono">{result.email}</span>
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-red-600 text-xs">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {showResults ? 'Close' : 'Cancel'}
          </Button>
          {!showResults && (
            <Button
              onClick={handleInvite}
              disabled={loading || parsedCount === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending {parsedCount} invitations...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Send {parsedCount} Invitation{parsedCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
