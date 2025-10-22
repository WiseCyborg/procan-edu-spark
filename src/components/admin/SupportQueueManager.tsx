import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Clock, CheckCircle, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SupportTicket {
  id: string;
  user_id: string;
  user_role: string;
  request_type: string;
  message: string;
  chat_context: any;
  status: string;
  assigned_to: string | null;
  priority: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email_cache: string;
  };
}

export const SupportQueueManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTickets();
    
    // Real-time subscription
    const channel = supabase
      .channel('support_queue_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'support_queue' },
        () => {
          loadTickets();
          toast({
            title: "Queue Updated",
            description: "New ticket or status change detected",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      // Fetch user profiles separately
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email_cache')
        .in('user_id', userIds);

      const ticketsWithProfiles = data.map(ticket => ({
        ...ticket,
        profiles: profiles?.find(p => p.user_id === ticket.user_id)
      }));

      setTickets(ticketsWithProfiles as SupportTicket[]);
    }
    setLoading(false);
  };

  const assignToMe = async (ticketId: string) => {
    const { error } = await supabase
      .from('support_queue')
      .update({ 
        assigned_to: user?.id,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    if (!error) {
      toast({
        title: "Ticket Assigned",
        description: "You are now handling this ticket",
      });
      await loadTickets();
    }
  };

  const resolveTicket = async () => {
    if (!selectedTicket || !resolutionNotes.trim()) return;
    
    const { error } = await supabase
      .from('support_queue')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedTicket.id);
    
    if (!error) {
      toast({
        title: "Ticket Resolved",
        description: "Ticket marked as resolved successfully",
      });
      setSelectedTicket(null);
      setResolutionNotes('');
      await loadTickets();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'in_progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  const pendingCount = tickets.filter(t => t.status === 'pending').length;
  const myTickets = tickets.filter(t => t.assigned_to === user?.id && t.status !== 'resolved');
  const resolvedToday = tickets.filter(t => {
    if (t.status !== 'resolved' || !t.resolved_at) return false;
    const today = new Date().toDateString();
    return new Date(t.resolved_at).toDateString() === today;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Stats */}
      <Card className="md:col-span-3">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{myTickets.length}</p>
              <p className="text-sm text-muted-foreground">My Active</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{resolvedToday}</p>
              <p className="text-sm text-muted-foreground">Resolved Today</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{tickets.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Support Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tickets yet</p>
          ) : (
            tickets.map(ticket => (
              <div 
                key={ticket.id}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedTicket?.id === ticket.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant="outline">{ticket.request_type}</Badge>
                    <Badge variant="secondary">{ticket.user_role}</Badge>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                  </div>
                  {ticket.status === 'pending' && (
                    <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  )}
                </div>
                
                <p className="text-sm font-medium mb-1">
                  {ticket.profiles?.first_name} {ticket.profiles?.last_name}
                </p>
                
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {ticket.message}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{new Date(ticket.created_at).toLocaleString()}</span>
                  {ticket.assigned_to && (
                    <span className="text-blue-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ticket.assigned_to === user?.id ? 'You' : 'Assigned'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Ticket Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTicket ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">User</h4>
                <p className="text-sm">
                  {selectedTicket.profiles?.first_name} {selectedTicket.profiles?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedTicket.profiles?.email_cache}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">Message</h4>
                <p className="text-sm">{selectedTicket.message}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">Context</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                  {JSON.stringify(selectedTicket.chat_context, null, 2)}
                </pre>
              </div>

              {selectedTicket.status === 'pending' && (
                <Button 
                  className="w-full"
                  onClick={() => assignToMe(selectedTicket.id)}
                >
                  Assign to Me
                </Button>
              )}

              {selectedTicket.status === 'in_progress' && selectedTicket.assigned_to === user?.id && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Resolution notes..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                  />
                  <Button 
                    className="w-full"
                    onClick={resolveTicket}
                    disabled={!resolutionNotes.trim()}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Resolved
                  </Button>
                </div>
              )}

              {selectedTicket.status === 'resolved' && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Resolution</h4>
                  <p className="text-sm text-muted-foreground">{selectedTicket.resolution_notes}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved at: {selectedTicket.resolved_at ? new Date(selectedTicket.resolved_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Select a ticket to view details
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
