import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Send, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailLog {
  id: string;
  recipient_email: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  subject: string | null;
  provider_id: string | null;
}

export const TestEmailSender = () => {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecentLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLogs(data || []);
    } catch (error: any) {
      console.error('Failed to load email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async (type: string) => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setSending(type);
    try {
      let result;

      switch (type) {
        case 'welcome':
          result = await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: testEmail,
              firstName: 'Test',
              lastName: 'User'
            }
          });
          break;

        case 'certificate':
          result = await supabase.functions.invoke('send-certificate-email', {
            body: {
              email: testEmail,
              firstName: 'Test',
              lastName: 'User',
              certificateNumber: 'TEST-2025-001',
              courseTitle: 'Maryland Responsible Vendor Training',
              issueDate: new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              certificateUrl: 'https://www.procannedu.com/certificates'
            }
          });
          break;

        case 'invitation':
          result = await supabase.functions.invoke('send-employee-invitation', {
            body: {
              email: testEmail,
              organizationName: 'Demo Dispensary',
              invitationToken: 'TEST-TOKEN-123',
              trainingDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
            }
          });
          break;

        default:
          throw new Error('Unknown email type');
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: "✅ Email Sent Successfully!",
        description: `${type} email sent to ${testEmail}`,
      });

      // Reload logs after sending
      setTimeout(() => loadRecentLogs(), 1000);

    } catch (error: any) {
      console.error('Email send error:', error);
      toast({
        title: "❌ Email Send Failed",
        description: error.message || "Failed to send email. Check edge function logs.",
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Email System
          </CardTitle>
          <CardDescription>
            Send test emails to verify Resend integration and email templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testEmail">Test Email Address</Label>
            <Input
              id="testEmail"
              type="email"
              placeholder="your@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => sendTestEmail('welcome')}
              disabled={!!sending}
              className="w-full"
            >
              {sending === 'welcome' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Welcome Email
                </>
              )}
            </Button>

            <Button
              onClick={() => sendTestEmail('certificate')}
              disabled={!!sending}
              variant="outline"
              className="w-full"
            >
              {sending === 'certificate' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Certificate Email
                </>
              )}
            </Button>

            <Button
              onClick={() => sendTestEmail('invitation')}
              disabled={!!sending}
              variant="outline"
              className="w-full"
            >
              {sending === 'invitation' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Invitation Email
                </>
              )}
            </Button>
          </div>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Make sure your email domain is verified in{" "}
              <a 
                href="https://resend.com/domains" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-800"
              >
                Resend Dashboard
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Email Logs</span>
            <Button 
              onClick={loadRecentLogs} 
              size="sm" 
              variant="outline"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Last 10 emails sent from the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No email logs yet. Click "Refresh" to load recent logs.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {log.status === 'sent' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : log.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                    <div>
                      <p className="font-medium">{log.email_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {log.recipient_email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className={`font-medium ${
                      log.status === 'sent' ? 'text-green-600' : 
                      log.status === 'failed' ? 'text-red-600' : 
                      'text-blue-600'
                    }`}>
                      {log.status}
                    </p>
                    <p className="text-muted-foreground">
                      {log.sent_at 
                        ? new Date(log.sent_at).toLocaleTimeString()
                        : new Date(log.created_at).toLocaleTimeString()
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
