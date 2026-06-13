import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Video, MessageSquare, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface SupportRequest {
  id: string;
  request_type: string;
  status: string;
  priority: string;
  subject: string;
  description: string;
  conversation_id: string | null;
  created_at: string;
  metadata: any;
  requester_id: string;
  requester?: {
    first_name: string;
    last_name: string;
    email_cache: string;
  };
}

export const SupportRequestsPanel = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from('support_requests')
        .select(`
          id,
          request_type,
          status,
          priority,
          subject,
          description,
          conversation_id,
          created_at,
          metadata,
          requester_id
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch requester profiles for each request
      if (data && data.length > 0) {
        const requesterIds = [...new Set(data.map(r => r.requester_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email_cache')
          .in('user_id', requesterIds);

        const enrichedRequests = data.map(request => ({
          ...request,
          requester: profiles?.find(p => p.user_id === request.requester_id)
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error('Error fetching support requests:', error);
      toast({
        title: 'Error Loading Requests',
        description: 'Unable to load support requests. Please refresh.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('support_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [filter]);

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_requests')
        .update({ 
          status: newStatus,
          ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Request marked as ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'video_call_request':
        return <Video className="h-4 w-4" />;
      case 'chat_escalation':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading support requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              ProCann Support Requests
            </CardTitle>
            <CardDescription>
              Staff members requesting live support or video call assistance
            </CardDescription>
          </div>
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          All inbound support email forwards to <span className="font-mono font-semibold text-foreground">info@procannedu.com</span>. Owners are assigned manually during triage — Gmail filters do not auto-route by alias.
        </div>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No {filter !== 'all' ? filter : ''} support requests</p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="p-4 border rounded-lg space-y-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getRequestIcon(request.request_type)}
                    <span className="font-semibold">{request.subject}</span>
                    <Badge variant={getPriorityColor(request.priority)}>
                      {request.priority}
                    </Badge>
                    <Badge variant="outline">
                      {request.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {request.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      From: {request.requester?.first_name || 'Unknown'} {request.requester?.last_name || ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {request.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => updateRequestStatus(request.id, 'in_progress')}
                    >
                      Accept
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {request.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateRequestStatus(request.id, 'resolved')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Resolve
                    </Button>
                  )}
                  {request.conversation_id && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.location.href = `/communication?conversation=${request.conversation_id}`}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Join Chat
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
