import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Mail, CheckCircle, XCircle, Clock, MousePointerClick, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailEvent {
  id: string;
  recipient_email: string;
  email_type: string;
  status: string;
  created_at: string;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  metadata?: any;
  subject?: string;
}

export const UserEmailHistory = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [emailHistory, setEmailHistory] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const searchHistory = async () => {
    if (!searchEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address to search',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Search email_logs
      const { data: logs } = await supabase
        .from('email_logs')
        .select('*')
        .ilike('recipient_email', `%${searchEmail}%`)
        .order('created_at', { ascending: false });

      // Search communication_logs for additional data
      const { data: commLogs } = await supabase
        .from('communication_logs')
        .select('*')
        .ilike('recipient_email', `%${searchEmail}%`)
        .order('created_at', { ascending: false });

      // Merge and deduplicate results
      const mergedHistory: EmailEvent[] = [];
      
      logs?.forEach(log => {
        const comm = commLogs?.find(c => c.recipient_email === log.recipient_email && c.created_at === log.created_at);
        mergedHistory.push({
          id: log.id,
          recipient_email: log.recipient_email,
          email_type: log.email_type,
          status: log.status,
          created_at: log.created_at,
          sent_at: log.sent_at,
          opened_at: comm?.opened_at,
          clicked_at: comm?.clicked_at,
          metadata: log.metadata,
          subject: comm?.subject,
        });
      });

      setEmailHistory(mergedHistory);

      if (mergedHistory.length === 0) {
        toast({
          title: 'No Results',
          description: `No emails found for ${searchEmail}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Could not search email history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const retryEmail = async (emailId: string) => {
    try {
      toast({
        title: 'Retrying Email',
        description: 'Attempting to resend...',
      });

      const { error } = await supabase.functions.invoke('retry-failed-email', {
        body: { email_id: emailId }
      });

      if (error) throw error;

      toast({
        title: 'Email Queued',
        description: 'Email will be resent shortly',
      });

      searchHistory();
    } catch (error) {
      toast({
        title: 'Retry Failed',
        description: 'Could not resend email',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (event: EmailEvent) => {
    if (event.status === 'failed') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (event.clicked_at) {
      return <MousePointerClick className="h-4 w-4 text-blue-500" />;
    }
    if (event.opened_at) {
      return <Eye className="h-4 w-4 text-green-500" />;
    }
    if (event.sent_at) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Email History</CardTitle>
          <CardDescription>
            Search complete email delivery timeline for any user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address (e.g., louis@example.com)"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchHistory()}
            />
            <Button onClick={searchHistory} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {emailHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Email Timeline for {searchEmail}</CardTitle>
            <CardDescription>
              {emailHistory.length} email(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {emailHistory.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(event)}
                        <h3 className="font-semibold">{event.email_type}</h3>
                        <Badge variant={event.status === 'sent' ? 'default' : 'destructive'}>
                          {event.status}
                        </Badge>
                      </div>
                      
                      {event.subject && (
                        <p className="text-sm text-muted-foreground mb-2">{event.subject}</p>
                      )}

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          <Mail className="h-3 w-3 inline mr-1" />
                          Sent: {event.sent_at ? formatDistanceToNow(new Date(event.sent_at), { addSuffix: true }) : 'Not sent'}
                        </p>
                        
                        {event.opened_at && (
                          <p className="text-green-600">
                            <Eye className="h-3 w-3 inline mr-1" />
                            Opened: {formatDistanceToNow(new Date(event.opened_at), { addSuffix: true })}
                          </p>
                        )}
                        
                        {event.clicked_at && (
                          <p className="text-blue-600">
                            <MousePointerClick className="h-3 w-3 inline mr-1" />
                            Clicked: {formatDistanceToNow(new Date(event.clicked_at), { addSuffix: true })}
                          </p>
                        )}

                        {event.metadata?.error && (
                          <p className="text-red-500">
                            <XCircle className="h-3 w-3 inline mr-1" />
                            Error: {event.metadata.error}
                          </p>
                        )}
                      </div>
                    </div>

                    {event.status === 'failed' && (
                      <Button size="sm" variant="outline" onClick={() => retryEmail(event.id)}>
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};