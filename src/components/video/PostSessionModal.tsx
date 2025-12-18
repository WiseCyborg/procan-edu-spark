import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  ListChecks, 
  Download, 
  Mail, 
  Flag, 
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  Brain
} from 'lucide-react';
import { useCoveredSessions } from '@/hooks/useCoveredSessions';

interface PostSessionModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SessionSummary {
  executive_summary?: string;
  key_outcomes?: string[];
  risks_identified?: string[];
  topics_discussed?: string[];
  duration_minutes?: number;
  participant_count?: number;
}

interface SessionAction {
  id: string;
  task_description: string;
  owner_name?: string;
  due_date?: string;
  priority: string;
  status: string;
}

export const PostSessionModal = ({ sessionId, isOpen, onClose }: PostSessionModalProps) => {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [actions, setActions] = useState<SessionAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getSessionSummary, getSessionActions, updateActionStatus } = useCoveredSessions();

  useEffect(() => {
    if (isOpen && sessionId) {
      loadSessionData();
    }
  }, [isOpen, sessionId]);

  const loadSessionData = async () => {
    setIsLoading(true);
    const [summaryData, actionsData] = await Promise.all([
      getSessionSummary(sessionId),
      getSessionActions(sessionId),
    ]);
    setSummary(summaryData as any);
    setActions(actionsData);
    setIsLoading(false);
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log('Export PDF');
  };

  const handleSendRecap = () => {
    // TODO: Implement email recap
    console.log('Send recap email');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Session Summary
          </DialogTitle>
          <DialogDescription>
            AI-generated summary, action items, and decisions from your session
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="flex gap-4 py-2">
              {summary?.duration_minutes && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {summary.duration_minutes} min
                </div>
              )}
              {summary?.participant_count && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {summary.participant_count} participants
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ListChecks className="h-4 w-4" />
                {actions.length} action items
              </div>
            </div>

            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="actions">Actions ({actions.length})</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {/* Executive Summary */}
                    <div>
                      <h4 className="font-medium mb-2">Executive Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {summary?.executive_summary || 'No summary available yet. The AI is processing the session.'}
                      </p>
                    </div>

                    {/* Key Outcomes */}
                    {summary?.key_outcomes && summary.key_outcomes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Key Outcomes
                        </h4>
                        <ul className="space-y-1">
                          {summary.key_outcomes.map((outcome, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-green-500">•</span>
                              {outcome}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risks */}
                    {summary?.risks_identified && summary.risks_identified.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Risks Identified
                        </h4>
                        <ul className="space-y-1">
                          {summary.risks_identified.map((risk, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-amber-500">•</span>
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Topics */}
                    {summary?.topics_discussed && summary.topics_discussed.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Topics Discussed</h4>
                        <div className="flex flex-wrap gap-2">
                          {summary.topics_discussed.map((topic, i) => (
                            <Badge key={i} variant="secondary">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="actions" className="mt-4">
                <ScrollArea className="h-[300px] pr-4">
                  {actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No action items extracted from this session
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {actions.map((action) => (
                        <div 
                          key={action.id} 
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
                          <Checkbox
                            checked={action.status === 'completed'}
                            onCheckedChange={(checked) => 
                              updateActionStatus(action.id, checked ? 'completed' : 'pending')
                            }
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${action.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {action.task_description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {action.owner_name && (
                                <span className="text-xs text-muted-foreground">
                                  Owner: {action.owner_name}
                                </span>
                              )}
                              {action.due_date && (
                                <span className="text-xs text-muted-foreground">
                                  Due: {new Date(action.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant={getPriorityColor(action.priority)}>
                            {action.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="transcript" className="mt-4">
                <ScrollArea className="h-[300px] pr-4">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Transcript available in full session view
                  </p>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendRecap}>
                <Mail className="h-4 w-4 mr-2" />
                Send Recap Email
              </Button>
              <Button variant="outline" size="sm">
                <Flag className="h-4 w-4 mr-2" />
                Flag Issues
              </Button>
              <Button variant="default" size="sm" onClick={onClose} className="ml-auto">
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
