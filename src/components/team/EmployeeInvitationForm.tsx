import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle, XCircle, UserPlus, Upload } from 'lucide-react';

interface InvitationResult {
  email: string;
  success: boolean;
  error?: string;
}

interface EmployeeInvitationFormProps {
  organizationId: string;
  organizationName: string;
  onInvitationsSent?: () => void;
}

export const EmployeeInvitationForm: React.FC<EmployeeInvitationFormProps> = ({
  organizationId,
  organizationName,
  onInvitationsSent
}) => {
  const [emails, setEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InvitationResult[]>([]);

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'));
  };

  const sendInvitations = async () => {
    const emailList = parseEmails(emails);
    
    if (emailList.length === 0) {
      toast.error('Please enter at least one valid email address');
      return;
    }

    setSending(true);
    setResults([]);

    const invitationResults: InvitationResult[] = [];

    for (const email of emailList) {
      try {
        // Generate invitation token
        const invitationToken = crypto.randomUUID();

        // Create staff invitation record
        const { error: inviteError } = await supabase
          .from('staff_invitations')
          .insert({
            organization_id: organizationId,
            email: email,
            invitation_token: invitationToken,
            status: 'pending',
            role: 'student',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });

        if (inviteError) throw inviteError;

        // Send invitation email
        const { error: emailError } = await supabase.functions.invoke(
          'send-employee-invitation',
          {
            body: {
              employeeEmail: email,
              organizationName,
              invitationToken,
              deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        );

        if (emailError) throw emailError;

        // Update status to sent
        await supabase
          .from('staff_invitations')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('invitation_token', invitationToken);

        invitationResults.push({ email, success: true });
      } catch (error: any) {
        console.error(`Failed to invite ${email}:`, error);
        
        invitationResults.push({
          email,
          success: false,
          error: error.message || 'Failed to send invitation'
        });
      }
    }

    setResults(invitationResults);
    setSending(false);

    const successCount = invitationResults.filter(r => r.success).length;
    const failCount = invitationResults.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`${successCount} invitation${successCount !== 1 ? 's' : ''} sent successfully!`);
      setEmails('');
      onInvitationsSent?.();
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} invitation${failCount !== 1 ? 's' : ''} failed to send`);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setEmails(text);
    };
    reader.readAsText(file);
  };

  const emailList = parseEmails(emails);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invite Employees to Training
        </CardTitle>
        <CardDescription>
          Send training invitations via email. Enter one email per line or upload a CSV file.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Employee Email Addresses</label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('csv-upload')?.click()}
              disabled={sending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
            <input
              id="csv-upload"
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <Textarea
            placeholder="employee1@example.com&#10;employee2@example.com&#10;employee3@example.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={8}
            disabled={sending}
            className="font-mono text-sm"
          />
          {emailList.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{emailList.length} email{emailList.length !== 1 ? 's' : ''} ready to send</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => setEmails('')}
                className="h-auto p-0"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <Alert>
          <UserPlus className="h-4 w-4" />
          <AlertDescription>
            Each employee will receive an invitation link valid for 7 days. 
            They must complete registration within 30 days to maintain compliance.
          </AlertDescription>
        </Alert>

        <Button
          onClick={sendInvitations}
          disabled={sending || emailList.length === 0}
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Invitations...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send {emailList.length} Invitation{emailList.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Invitation Results</h4>
            <div className="space-y-1">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 text-sm border rounded"
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-mono">{result.email}</span>
                  </div>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? 'Sent' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
