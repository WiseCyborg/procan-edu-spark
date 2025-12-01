// Phase 6: Live Training Room Component
import { useState, useEffect } from 'react';
import { Hand, MessageSquare, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoCallRoom } from '@/components/video/VideoCallRoom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LiveTrainingRoomProps {
  token: string;
  roomName: string;
  serverUrl: string;
  onDisconnect: () => void;
  isHost: boolean;
  conversationId: string;
}

interface QueuedQuestion {
  id: string;
  user_id: string;
  user_name: string;
  question: string;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at?: string;
  answered_by?: string;
}

export const LiveTrainingRoom = ({
  token,
  roomName,
  serverUrl,
  onDisconnect,
  isHost,
  conversationId,
}: LiveTrainingRoomProps) => {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(true);
  const [showQueue, setShowQueue] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [questionQueue, setQuestionQueue] = useState<QueuedQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch questions from database
  useEffect(() => {
    fetchQuestions();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`training_questions:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_questions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('training_questions')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuestionQueue((data || []) as QueuedQuestion[]);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleRaiseHand = () => {
    setHandRaised(!handRaised);
    // TODO: Broadcast hand raise to other participants via LiveKit data channel
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('training_questions')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          user_name: `${user.user_metadata?.first_name || 'User'} ${user.user_metadata?.last_name || ''}`.trim(),
          question: newQuestion.trim(),
          status: 'pending',
        });

      if (error) throw error;
      
      setNewQuestion('');
      toast.success('Question submitted to queue');
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error('Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerQuestion = async (questionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('training_questions')
        .update({
          status: 'answered',
          answered_at: new Date().toISOString(),
          answered_by: user.id,
        })
        .eq('id', questionId);

      if (error) throw error;
      toast.success('Question marked as answered');
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question');
    }
  };

  return (
    <div className="flex h-full gap-2 bg-background p-2">
      {/* Main video area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 rounded-lg overflow-hidden border border-border">
          <VideoCallRoom
            token={token}
            roomName={roomName}
            serverUrl={serverUrl}
            onDisconnect={onDisconnect}
            isHost={isHost}
          />
        </div>

        {/* Training controls */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg mt-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="animate-pulse">
              ● LIVE TRAINING
            </Badge>
            <span className="text-sm text-muted-foreground">
              {roomName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={handRaised ? 'default' : 'outline'}
              size="sm"
              onClick={handleRaiseHand}
              className="gap-2"
            >
              <Hand className="w-4 h-4" />
              {handRaised ? 'Hand Raised' : 'Raise Hand'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </Button>

            {isHost && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQueue(!showQueue)}
                  className="gap-2"
                >
                  <Users className="w-4 h-4" />
                  Q&A Queue
                  {questionQueue.length > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {questionQueue.length}
                    </Badge>
                  )}
                </Button>

                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Session
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar with Chat and Q&A Queue */}
      <div className="w-80 flex flex-col gap-2">
        {/* Q&A Queue (Host only) */}
        {isHost && showQueue && (
          <div className="flex-1 bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Question Queue
              </h3>
              <Badge variant="secondary">{questionQueue.length}</Badge>
            </div>

            <ScrollArea className="h-[200px]">
              {questionQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No questions in queue
                </p>
              ) : (
                <div className="space-y-3">
                  {questionQueue.map((q) => (
                    <div key={q.id} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{q.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(q.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{q.question}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleAnswerQuestion(q.id)}
                      >
                        Mark as Answered
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Chat section */}
        {showChat && (
          <div className="flex-1 bg-card border border-border rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </h3>
            </div>

            <ScrollArea className="flex-1 mb-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Chat messages will appear here
              </p>
            </ScrollArea>

            {/* Ask question input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Ask a question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="resize-none"
                rows={3}
              />
              <Button
                onClick={handleSubmitQuestion}
                className="w-full"
                disabled={!newQuestion.trim() || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Question'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
