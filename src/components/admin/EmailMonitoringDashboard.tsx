import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Send, 
  Download,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailLog {
  id: string;
  user_id: string | null;
  email_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  provider_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface EmailMetrics {
  totalSent: number;
  deliveryRate: number;
  failedCount: number;
  recentCount: number;
}

const EmailMonitoringDashboard = () => {
  const { toast } = useToast();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EmailLog[]>([]);
  const [metrics, setMetrics] = useState<EmailMetrics>({
    totalSent: 0,
    deliveryRate: 0,
    failedCount: 0,
    recentCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchEmailLogs();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [emailLogs, searchQuery, statusFilter, typeFilter]);

  const fetchEmailLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      setEmailLogs(data || []);
      calculateMetrics(data || []);
    } catch (error) {
      console.error('Error fetching email logs:', error);
      toast({
        title: "Error",
        description: "Failed to load email logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('email-logs-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'email_logs' },
        (payload) => {
          console.log('Email log update:', payload);
          fetchEmailLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateMetrics = (logs: EmailLog[]) => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const totalSent = logs.length;
    const deliveredCount = logs.filter(log => log.status === 'delivered' || log.status === 'sent').length;
    const failedCount = logs.filter(log => log.status === 'failed').length;
    const recentCount = logs.filter(log => new Date(log.created_at) > last24Hours).length;

    setMetrics({
      totalSent,
      deliveryRate: totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100) : 0,
      failedCount,
      recentCount
    });
  };

  const filterLogs = () => {
    let filtered = [...emailLogs];

    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.email_type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.email_type === typeFilter);
    }

    setFilteredLogs(filtered);
  };

  const retryFailedEmail = async (emailId: string) => {
    toast({
      title: "Retry Not Implemented",
      description: "Email retry functionality is not yet available",
    });
  };

  const sendTestEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user email found');

      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: { 
          email: user.email,
          firstName: 'Test',
          lastName: 'User'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test email sent successfully",
      });
      
      fetchEmailLogs();
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive"
      });
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Recipient', 'Type', 'Subject', 'Status'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.recipient_email,
        log.email_type,
        `"${log.subject}"`,
        log.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      delivered: { className: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
      sent: { className: 'bg-blue-100 text-blue-800', icon: <Send className="w-3 h-3 mr-1" /> },
      failed: { className: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3 mr-1" /> },
      pending: { className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3 mr-1" /> },
    };

    const variant = variants[status] || variants.pending;

    return (
      <Badge className={variant.className}>
        {variant.icon}
        {status}
      </Badge>
    );
  };

  const getEmailTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      welcome: 'bg-green-100 text-green-800',
      staff_invitation: 'bg-blue-100 text-blue-800',
      verification_code: 'bg-orange-100 text-orange-800',
      certificate: 'bg-purple-100 text-purple-800',
      payment_confirmation: 'bg-teal-100 text-teal-800',
      password_reset: 'bg-red-100 text-red-800',
      seat_purchase: 'bg-indigo-100 text-indigo-800',
      deadline_reminder: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const failedEmails = emailLogs.filter(log => log.status === 'failed');
  const uniqueTypes = [...new Set(emailLogs.map(log => log.email_type))];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                <p className="text-3xl font-bold">{metrics.totalSent}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
                <p className="text-3xl font-bold text-green-600">{metrics.deliveryRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Success rate</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last 24 Hours</p>
                <p className="text-3xl font-bold text-blue-600">{metrics.recentCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Recent activity</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-3xl font-bold text-red-600">{metrics.failedCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Email Communications
            </CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={sendTestEmail}>
                <Send className="w-4 h-4 mr-2" />
                Send Test
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={fetchEmailLogs}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Emails</TabsTrigger>
              <TabsTrigger value="failed">
                Failed
                {failedEmails.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {failedEmails.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search emails..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email Logs Table */}
              <div className="border rounded-lg">
                <div className="max-h-[600px] overflow-auto">
                  {loading ? (
                    <div className="flex justify-center items-center p-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No email logs found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedEmail(log)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                {getEmailTypeBadge(log.email_type)}
                                {getStatusBadge(log.status)}
                              </div>
                              <p className="font-medium">{log.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                To: {log.recipient_email}
                              </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              {formatDate(log.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="failed" className="space-y-4">
              {failedEmails.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p className="font-medium">No failed emails!</p>
                  <p className="text-sm">All emails are delivering successfully.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {failedEmails.length} failed email{failedEmails.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="divide-y border rounded-lg">
                    {failedEmails.map((log) => (
                      <div key={log.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getEmailTypeBadge(log.email_type)}
                              {getStatusBadge(log.status)}
                            </div>
                            <p className="font-medium">{log.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              To: {log.recipient_email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Failed at: {formatDate(log.created_at)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryFailedEmail(log.id)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Email Detail Modal */}
      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              Complete information about this email communication
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <div className="mt-1">{getEmailTypeBadge(selectedEmail.email_type)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recipient</p>
                  <p className="mt-1">{selectedEmail.recipient_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sent At</p>
                  <p className="mt-1">{formatDate(selectedEmail.created_at)}</p>
                </div>
                {selectedEmail.delivered_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivered At</p>
                    <p className="mt-1">{formatDate(selectedEmail.delivered_at)}</p>
                  </div>
                )}
                {selectedEmail.provider_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Provider ID</p>
                    <p className="mt-1 text-xs font-mono">{selectedEmail.provider_id}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subject</p>
                <p className="mt-1">{selectedEmail.subject}</p>
              </div>
              {selectedEmail.status === 'failed' && (
                <div className="flex justify-end">
                  <Button onClick={() => retryFailedEmail(selectedEmail.id)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Email
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailMonitoringDashboard;
