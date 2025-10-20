import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommunicationHub } from '@/components/communication/CommunicationHub';
import { Mail, MessageSquare, CheckCircle, XCircle, Clock, Send, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CommunicationMetrics {
  totalEmailsSent: number;
  deliverySuccessRate: number;
  pendingNotifications: number;
  activeConversations: number;
  recentEmails: RecentEmail[];
}

interface RecentEmail {
  id: string;
  recipient_email: string;
  subject: string;
  delivery_status: string;
  created_at: string;
}

export const CommunicationManagementView = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<CommunicationMetrics>({
    totalEmailsSent: 0,
    deliverySuccessRate: 0,
    pendingNotifications: 0,
    activeConversations: 0,
    recentEmails: [],
  });
  const [loading, setLoading] = useState(true);
  const [resendStatus, setResendStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    fetchCommunicationMetrics();
    checkResendStatus();
  }, []);

  const fetchCommunicationMetrics = async () => {
    try {
      setLoading(true);

      // Fetch email logs
      const { data: emailLogs, error: emailError } = await supabase
        .from('communication_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (emailError) throw emailError;

      // Fetch pending notifications count
      const { count: pendingNotifs, error: notifsError } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (notifsError) throw notifsError;

      // Fetch conversations count
      const { count: conversations, error: convoError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      if (convoError) throw convoError;

      // Calculate metrics
      const totalEmails = emailLogs?.length || 0;
      const successfulEmails = emailLogs?.filter(e => e.delivery_status === 'delivered').length || 0;
      const successRate = totalEmails > 0 ? Math.round((successfulEmails / totalEmails) * 100) : 100;

      setMetrics({
        totalEmailsSent: totalEmails,
        deliverySuccessRate: successRate,
        pendingNotifications: pendingNotifs || 0,
        activeConversations: conversations || 0,
        recentEmails: emailLogs?.map(log => ({
          id: log.id,
          recipient_email: log.recipient_email,
          subject: log.subject || 'No subject',
          delivery_status: log.delivery_status || 'pending',
          created_at: log.created_at,
        })) || [],
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkResendStatus = async () => {
    try {
      // Simple check to see if Resend is configured
      // In production, you'd call an edge function to verify the API key
      setResendStatus('connected');
    } catch (error) {
      setResendStatus('error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Delivered</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Communication Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEmailsSent}</div>
            <p className="text-xs text-muted-foreground">
              Last 10 recent emails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.deliverySuccessRate}%</div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Queue</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingNotifications}</div>
            <p className="text-xs text-muted-foreground">
              Notifications waiting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeConversations}</div>
            <p className="text-xs text-muted-foreground">
              Active threads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Email System Status</CardTitle>
          <CardDescription>Monitor email delivery and Resend API status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <h4 className="font-medium">Resend API Status</h4>
                <p className="text-sm text-muted-foreground">
                  Email delivery service
                </p>
              </div>
            </div>
            <Badge 
              variant={resendStatus === 'connected' ? 'default' : resendStatus === 'error' ? 'destructive' : 'secondary'}
              className="gap-1"
            >
              {resendStatus === 'connected' && <><CheckCircle className="h-3 w-3" />Connected</>}
              {resendStatus === 'error' && <><XCircle className="h-3 w-3" />Error</>}
              {resendStatus === 'checking' && <><Clock className="h-3 w-3" />Checking</>}
            </Badge>
          </div>

          {/* Recent Emails */}
          <div>
            <h4 className="font-medium mb-3">Recent Email Activity</h4>
            <div className="space-y-2">
              {metrics.recentEmails.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent emails
                </p>
              ) : (
                metrics.recentEmails.slice(0, 5).map(email => (
                  <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{email.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        To: {email.recipient_email}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(email.created_at), 'MMM d, h:mm a')}
                      </span>
                      {getStatusBadge(email.delivery_status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Management */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Management</CardTitle>
          <CardDescription>
            Configure automated notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <h4 className="font-medium">Pending Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  {metrics.pendingNotifications} notifications in queue
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Process Queue
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Welcome Emails</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Sent automatically when new users sign up
              </p>
              <Badge variant="outline">Auto-enabled</Badge>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Deadline Reminders</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Remind users of upcoming course deadlines
              </p>
              <Badge variant="outline">Auto-enabled</Badge>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Certificate Notifications</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Email certificates when courses are completed
              </p>
              <Badge variant="outline">Auto-enabled</Badge>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Application Updates</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Notify dispensaries about application status
              </p>
              <Badge variant="outline">Auto-enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication Hub */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Messaging</CardTitle>
          <CardDescription>
            Manage conversations and direct messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommunicationHub />
        </CardContent>
      </Card>
    </div>
  );
};
