import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Session {
  id: string;
  title: string;
  scenario_type: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
  user_name: string;
  organization_name: string | null;
}

interface AiLeanSessionViewerProps {
  sessionId?: string;
  userId?: string;
  onClose: () => void;
}

export const AiLeanSessionViewer = ({ sessionId, userId, onClose }: AiLeanSessionViewerProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('ailean_sessions')
          .select('*');

        if (sessionId) {
          query = query.eq('id', sessionId);
        } else if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch profile data separately
        const userIds = [...new Set((data || []).map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, organization_id, organizations(name)')
          .in('user_id', userIds);

        // Create a map of user profiles
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

        const formattedSessions = (data || []).map(s => {
          const profile = profileMap.get(s.user_id);
          const messages = Array.isArray(s.messages) ? s.messages : [];
          return {
            id: s.id,
            title: s.title || 'Untitled Session',
            scenario_type: s.scenario_type,
            messages: messages.map((m: any) => ({
              role: m.role || 'user',
              content: m.content || '',
              timestamp: m.timestamp || new Date().toISOString(),
            })) as Message[],
            created_at: s.created_at,
            updated_at: s.updated_at,
            user_name: profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              : 'Unknown User',
            organization_name: profile?.organizations?.name || null,
          };
        });

        setSessions(formattedSessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load session details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [sessionId, userId, toast]);

  const handleDeleteSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ailean_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Session Deleted',
        description: 'The session has been successfully deleted',
      });

      setSessions(prev => prev.filter(s => s.id !== id));
      
      if (sessions.length <= 1) {
        onClose();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
    }
  };

  const handleExportSession = (session: Session) => {
    const content = `
AiLean Coaching Session Export
===============================

Title: ${session.title}
Scenario: ${session.scenario_type || 'General Management'}
Manager: ${session.user_name}
Organization: ${session.organization_name || 'N/A'}
Created: ${new Date(session.created_at).toLocaleString()}
Duration: ${Math.round((new Date(session.updated_at).getTime() - new Date(session.created_at).getTime()) / 1000 / 60)} minutes

Conversation:
-------------

${session.messages.map(msg => `
[${msg.role.toUpperCase()}] ${new Date(msg.timestamp).toLocaleString()}
${msg.content}
`).join('\n---\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ailean-session-${session.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Session Exported',
      description: 'The session has been downloaded as a text file',
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {sessionId ? 'Session Details' : 'Manager Sessions'}
          </DialogTitle>
          <DialogDescription>
            {loading ? 'Loading...' : `${sessions.length} session(s) found`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {sessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4 space-y-4">
                  {/* Session Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{session.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{session.user_name}</span>
                        {session.organization_name && <span>• {session.organization_name}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {session.scenario_type && (
                          <Badge variant="outline">{session.scenario_type}</Badge>
                        )}
                        <Badge variant="secondary">
                          {session.messages.length} messages
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportSession(session)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="space-y-3">
                    {session.messages.map((message, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {message.role === 'user' ? 'Manager' : 'AiLean'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
