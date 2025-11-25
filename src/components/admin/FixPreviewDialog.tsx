import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FixStep {
  step: number;
  description: string;
  action: string;
  expectedResult: string;
}

interface FixPlan {
  id: string;
  check_id: string;
  root_cause: string;
  fix_steps: FixStep[];
  affected_systems: { systems: string[] };
  risk_level: 'low' | 'medium' | 'high';
  estimated_duration_seconds: number;
  rollback_strategy: string;
  validationSteps?: string[];
}

interface IntegrityCheck {
  id: string;
  check_type: string;
  severity: string;
  issue_description: string;
  status: string;
}

interface FixPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  check: IntegrityCheck;
  fixPlan: FixPlan;
  onFixComplete: () => void;
}

export function FixPreviewDialog({ open, onClose, check, fixPlan, onFixComplete }: FixPreviewDialogProps) {
  const [understoodChanges, setUnderstoodChanges] = useState(false);
  const [reviewedChanges, setReviewedChanges] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionSteps, setExecutionSteps] = useState<string[]>([]);
  const [executionComplete, setExecutionComplete] = useState(false);
  const [executionSuccess, setExecutionSuccess] = useState(false);
  const { toast } = useToast();

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle2 className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleExecuteFix = async () => {
    setIsExecuting(true);
    setExecutionProgress(10);
    setExecutionSteps(['Starting fix execution...']);

    try {
      const { data, error } = await supabase.functions.invoke('execute-ai-fix', {
        body: {
          planId: fixPlan.id,
          checkId: check.id
        }
      });

      if (error) throw error;

      setExecutionProgress(50);
      setExecutionSteps(prev => [...prev, 'Applying fix...']);

      // Simulate progress for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      setExecutionProgress(100);
      setExecutionSteps(prev => [...prev, 'Fix completed successfully!']);
      setExecutionComplete(true);
      setExecutionSuccess(true);

      toast({
        title: "Fix Executed Successfully",
        description: "The system integrity issue has been resolved.",
      });

      // Wait a moment to show success before closing
      setTimeout(() => {
        onFixComplete();
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Fix execution failed:', error);
      setExecutionProgress(100);
      setExecutionSteps(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setExecutionComplete(true);
      setExecutionSuccess(false);

      toast({
        title: "Fix Execution Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    setUnderstoodChanges(false);
    setReviewedChanges(false);
    setExecutionProgress(0);
    setExecutionSteps([]);
    setExecutionComplete(false);
    setExecutionSuccess(false);
    onClose();
  };

  const canExecute = understoodChanges && reviewedChanges && !isExecuting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Fix Preview: {check.check_type}
          </DialogTitle>
        </DialogHeader>

        {!executionComplete ? (
          <div className="space-y-6">
            {/* Section 1: What's Wrong */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                What's Wrong
              </h3>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Issue Type:</span>
                  <Badge variant="destructive">{check.severity}</Badge>
                </div>
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-sm text-muted-foreground mt-1">{check.issue_description}</p>
                </div>
                <div>
                  <span className="font-medium">Current Status:</span>
                  <span className="text-sm ml-2">{check.status}</span>
                </div>
              </div>
            </div>

            {/* Section 2: AI Analysis & Recommended Fix */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                🤖 AI Analysis & Recommended Fix
              </h3>
              
              {/* Root Cause */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium mb-2">Root Cause:</div>
                <p className="text-sm text-muted-foreground">{fixPlan.root_cause}</p>
              </div>

              {/* Affected Systems */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium mb-2">Affected Systems:</div>
                <div className="flex flex-wrap gap-2">
                  {fixPlan.affected_systems.systems.map((system, idx) => (
                    <Badge key={idx} variant="outline">{system}</Badge>
                  ))}
                </div>
              </div>

              {/* Fix Steps */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium mb-3">Fix Steps:</div>
                <div className="space-y-3">
                  {fixPlan.fix_steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {step.step}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm">{step.description}</div>
                        <div className="text-xs text-muted-foreground">
                          Action: {step.action}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expected: {step.expectedResult}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getRiskIcon(fixPlan.risk_level)}
                    <span className="font-medium">Risk Level:</span>
                  </div>
                  <Badge className={getRiskColor(fixPlan.risk_level)}>
                    {fixPlan.risk_level.toUpperCase()}
                  </Badge>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Estimated Time:</span>
                  </div>
                  <span className="text-sm">~{fixPlan.estimated_duration_seconds} seconds</span>
                </div>
              </div>

              {/* Rollback Strategy */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium mb-2">Rollback Strategy:</div>
                <p className="text-sm text-muted-foreground">{fixPlan.rollback_strategy}</p>
              </div>
            </div>

            {/* Section 3: Confirmation */}
            {!isExecuting && (
              <div className="space-y-4 p-4 border-2 border-primary rounded-lg">
                <h3 className="text-lg font-semibold">Confirmation Required</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="understood"
                      checked={understoodChanges}
                      onCheckedChange={(checked) => setUnderstoodChanges(checked as boolean)}
                    />
                    <label htmlFor="understood" className="text-sm cursor-pointer leading-tight">
                      I understand this fix will affect {fixPlan.affected_systems.systems.length} system(s) 
                      and execute {fixPlan.fix_steps.length} step(s)
                    </label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="reviewed"
                      checked={reviewedChanges}
                      onCheckedChange={(checked) => setReviewedChanges(checked as boolean)}
                    />
                    <label htmlFor="reviewed" className="text-sm cursor-pointer leading-tight">
                      I have reviewed the changes and want to proceed with execution
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Execution Progress */}
            {isExecuting && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">Executing Fix...</span>
                </div>
                <Progress value={executionProgress} />
                <div className="space-y-1">
                  {executionSteps.map((step, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            {executionSuccess ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold">Fix Executed Successfully!</h3>
                <p className="text-muted-foreground">The system integrity issue has been resolved.</p>
              </>
            ) : (
              <>
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                <h3 className="text-xl font-semibold">Fix Execution Failed</h3>
                <p className="text-muted-foreground">Please review the errors and try again.</p>
                <div className="text-left p-4 bg-muted rounded-lg">
                  {executionSteps.map((step, idx) => (
                    <div key={idx} className="text-sm">{step}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isExecuting}>
            {executionComplete ? 'Close' : 'Cancel'}
          </Button>
          {!executionComplete && (
            <Button
              onClick={handleExecuteFix}
              disabled={!canExecute}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                'Execute Fix'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}