import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Search, Mail, CheckCircle, XCircle, AlertTriangle, Clock, Eye, MousePointer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface EmailLog {
  id: string;
  created_at: string;
  sent_at: string | null;
  recipient_email: string;
  subject: string | null;
  status: string | null;
  provider: string | null;
  email_type: string;
  error_message: string | null;
  open_count: number | null;
  click_count: number | null;
}

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  queued: { color: 'bg-gray-500', icon: Clock },
  sending: { color: 'bg-blue-500', icon: Mail },
  sent: { color: 'bg-green-500', icon: CheckCircle },
  delivered: { color: 'bg-green-600', icon: CheckCircle },
  opened: { color: 'bg-purple-500', icon: Eye },
  clicked: { color: 'bg-indigo-500', icon: MousePointer },
  bounced: { color: 'bg-yellow-500', icon: AlertTriangle },
  failed: { color: 'bg-red-500', icon: XCircle },
  complaint: { color: 'bg-red-600', icon: AlertTriangle },
};

export const EmailLogsTable = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['email-logs', statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.or(`recipient_email.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const getStatusBadge = (status: string | null) => {
    const config = statusConfig[status || 'queued'] || statusConfig.queued;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {status || 'Unknown'}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Logs
            </CardTitle>
            <CardDescription>Single source of truth for all email activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="clicked">Clicked</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="complaint">Complaint</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject/Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No email logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {log.sent_at 
                        ? formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })
                        : formatDistanceToNow(new Date(log.created_at), { addSuffix: true })
                      }
                    </TableCell>
                    <TableCell className="font-mono text-sm truncate max-w-[200px]">
                      {log.recipient_email}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate text-sm">{log.subject || log.email_type}</div>
                      {log.error_message && (
                        <div className="text-xs text-red-500 truncate">{log.error_message}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.provider || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.open_count || 0}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.click_count || 0}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
