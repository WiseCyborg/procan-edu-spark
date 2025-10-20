import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed';
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

export const RealTimeEmailDashboard = () => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState({ sent: 0, opened: 0, clicked: 0, failed: 0 });

  useEffect(() => {
    fetchEmails();

    const channel = supabase
      .channel('email-tracking-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'communication_logs' },
        () => fetchEmails()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmails = async () => {
    const { data } = await supabase
      .from('communication_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setEmails(data as EmailLog[]);
      setStats({
        sent: data.filter(e => e.delivery_status === 'sent').length,
        opened: data.filter(e => e.opened_at).length,
        clicked: data.filter(e => e.clicked_at).length,
        failed: data.filter(e => e.delivery_status === 'failed').length,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Opened</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.opened}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Clicked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.clicked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Email Activity</CardTitle>
          <CardDescription>Real-time email delivery tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {emails.map((email) => (
              <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{email.recipient_email}</p>
                  <p className="text-sm text-muted-foreground truncate">{email.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {email.opened_at && (
                    <Badge variant="outline" className="bg-green-50">
                      <Check className="h-3 w-3 mr-1" />Opened
                    </Badge>
                  )}
                  {email.clicked_at && (
                    <Badge variant="outline" className="bg-blue-50">Clicked</Badge>
                  )}
                  {email.delivery_status === 'failed' && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />Failed
                    </Badge>
                  )}
                  {email.delivery_status === 'pending' && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {emails.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No email activity yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
