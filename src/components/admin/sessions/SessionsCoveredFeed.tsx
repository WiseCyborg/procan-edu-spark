import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Video, 
  FileText, 
  ListChecks, 
  ChevronRight,
  Clock,
  Users,
  Building2
} from 'lucide-react';
import { useCoveredSessions } from '@/hooks/useCoveredSessions';
import { PostSessionModal } from '@/components/video/PostSessionModal';
import { format, formatDistanceToNow } from 'date-fns';

const sessionTypeLabels: Record<string, string> = {
  training: 'Training',
  uat: 'UAT',
  admin_ops: 'Admin Ops',
  onboarding: 'Onboarding',
  support: 'Support',
  general: 'General',
};

const sessionTypeColors: Record<string, string> = {
  training: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  uat: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin_ops: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  onboarding: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  support: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export const SessionsCoveredFeed = () => {
  const { sessions, isLoading } = useCoveredSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const inProgressSessions = sessions.filter(s => s.status === 'in_progress');

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            Sessions Covered
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* In Progress */}
          {inProgressSessions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">In Progress</p>
              <div className="space-y-2">
                {inProgressSessions.map(session => (
                  <div 
                    key={session.id}
                    className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Started {formatDistanceToNow(new Date(session.started_at!), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge className={sessionTypeColors[session.session_type]}>
                      {sessionTypeLabels[session.session_type]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Completed */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Recent Sessions</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : completedSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No covered sessions yet</p>
                <p className="text-xs">Start a session with agent coverage enabled</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-2 pr-4">
                  {completedSessions.slice(0, 10).map(session => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{session.title}</p>
                          <Badge variant="outline" className={`text-xs ${sessionTypeColors[session.session_type]}`}>
                            {sessionTypeLabels[session.session_type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.ended_at 
                              ? format(new Date(session.ended_at), 'MMM d, h:mm a')
                              : 'Unknown'
                            }
                          </span>
                          {session.transcribe && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Transcribed
                            </span>
                          )}
                          {session.track_actions && (
                            <span className="flex items-center gap-1">
                              <ListChecks className="h-3 w-3" />
                              Actions
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Post Session Modal */}
      {selectedSessionId && (
        <PostSessionModal
          sessionId={selectedSessionId}
          isOpen={!!selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </>
  );
};
