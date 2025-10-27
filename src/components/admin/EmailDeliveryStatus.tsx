import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface EmailLog {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: string;
  provider: string | null;
  provider_id: string | null;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
  metadata: any;
}

export const EmailDeliveryStatus: React.FC<{ recipientEmail?: string }> = ({ recipientEmail }) => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEmailLogs();
  }, [recipientEmail]);

  const loadEmailLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (recipientEmail) {
        query = query.eq('recipient_email', recipientEmail);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error loading email logs:', error);
      toast({
        title: "Error",
        description: "Failed to load email delivery status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryEmail = async (emailLog: EmailLog) => {
    setRetrying(emailLog.id);
    try {
      // Call auto-retry edge function for this specific email
      const { data, error } = await supabase.functions.invoke('auto-retry-failed-emails', {
        body: { specificEmailId: emailLog.id }
      });

      if (error) throw error;

      toast({
        title: "Retry Initiated",
        description: "The email is being resent. Please check back in a moment.",
      });

      // Reload email logs after a brief delay
      setTimeout(() => {
        loadEmailLogs();
      }, 2000);
    } catch (error) {
      toast({
        title: "Retry Failed",
        description: error instanceof Error ? error.message : 'Failed to retry email',
        variant: "destructive"
      });
    } finally {
      setRetrying(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
      case 'permanent_failure':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'sending':
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      failed: "destructive",
      permanent_failure: "destructive",
      sending: "secondary",
      pending: "outline"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Delivery Status
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadEmailLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <Alert>
            <AlertDescription>
              No email delivery records found
              {recipientEmail && ` for ${recipientEmail}`}.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => {
              const retryHistory = email.metadata?.retry_history || [];
              const retryCount = retryHistory.length;

              return (
                <div
                  key={email.id}
                  className="border border-border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(email.status)}
                      <div>
                        <p className="font-medium text-sm">{email.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          To: {email.recipient_email}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(email.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Type:</span> {email.email_type}
                    </div>
                    <div>
                      <span className="font-medium">Provider:</span>{' '}
                      {email.provider || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(email.created_at).toLocaleString()}
                    </div>
                    {email.sent_at && (
                      <div>
                        <span className="font-medium">Sent:</span>{' '}
                        {new Date(email.sent_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {retryCount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Retries:</span> {retryCount}
                    </div>
                  )}

                  {email.error_message && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertDescription className="text-xs">
                        {email.error_message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {(email.status === 'failed' || email.status === 'sending') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetryEmail(email)}
                      disabled={retrying === email.id}
                      className="w-full mt-2"
                    >
                      {retrying === email.id ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Retry Now
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};