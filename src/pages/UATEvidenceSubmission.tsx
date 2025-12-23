import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { 
  ClipboardCheck, 
  Upload, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Camera,
  Link as LinkIcon,
  FileText,
  Save
} from 'lucide-react';

interface UATTask {
  id: string;
  title: string;
  description: string;
  role_to_test: string;
  expected_result: string;
  deep_link: string;
}

interface UATRun {
  id: string;
  run_code: string;
  status: string;
  organizations: {
    name: string;
    uat_email: string;
  };
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'dispensary_manager', label: 'Dispensary Manager' },
  { value: 'training_coordinator', label: 'Training Coordinator' },
  { value: 'employee', label: 'Employee' },
];

const UATEvidenceSubmission: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const runId = searchParams.get('runId');

  const [task, setTask] = useState<UATTask | null>(null);
  const [run, setRun] = useState<UATRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    roleUsed: '',
    actionPerformed: '',
    expectedResult: '',
    actualResult: '',
    screenshotPath: '',
    downloadLink: '',
    recordIds: '',
    passed: null as boolean | null,
    notes: '',
  });

  useEffect(() => {
    if (!taskId && !runId) {
      toast({
        title: 'Missing Parameters',
        description: 'Task ID or Run ID is required',
        variant: 'destructive',
      });
      navigate('/profile');
      return;
    }

    fetchTaskDetails();
  }, [taskId, runId]);

  const fetchTaskDetails = async () => {
    try {
      if (taskId) {
        const { data: taskData, error: taskError } = await supabase
          .from('uat_tasks')
          .select(`
            *,
            uat_runs (
              id,
              run_code,
              status,
              organizations (
                name,
                uat_email
              )
            )
          `)
          .eq('id', taskId)
          .single();

        if (taskError) throw taskError;
        
        setTask(taskData);
        setRun(taskData.uat_runs);
        setFormData(prev => ({
          ...prev,
          roleUsed: taskData.role_to_test || '',
          expectedResult: taskData.expected_result || '',
        }));
      } else if (runId) {
        const { data: runData, error: runError } = await supabase
          .from('uat_runs')
          .select(`
            id,
            run_code,
            status,
            organizations (
              name,
              uat_email
            )
          `)
          .eq('id', runId)
          .single();

        if (runError) throw runError;
        setRun(runData);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.passed === null) {
      toast({
        title: 'Validation Error',
        description: 'Please indicate whether the test passed or failed',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.actionPerformed.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please describe the action performed',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse record IDs if provided
      let recordIds: string[] = [];
      if (formData.recordIds.trim()) {
        recordIds = formData.recordIds.split(',').map(id => id.trim());
      }

      // Insert evidence record
      const { error: evidenceError } = await supabase
        .from('uat_evidence')
        .insert({
          run_id: run?.id || runId,
          task_id: taskId,
          tester_email: user?.email || '',
          role_used: formData.roleUsed,
          action_performed: formData.actionPerformed,
          expected_result: formData.expectedResult,
          actual_result: formData.actualResult,
          screenshot_path: formData.screenshotPath || null,
          download_link: formData.downloadLink || null,
          record_ids: recordIds,
          passed: formData.passed,
          notes: formData.notes || null,
        });

      if (evidenceError) throw evidenceError;

      // Update task status if this is for a specific task
      if (taskId) {
        await supabase
          .from('uat_tasks')
          .update({
            status: formData.passed ? 'complete' : 'blocked',
            evidence: formData.actualResult,
            completed_at: formData.passed ? new Date().toISOString() : null,
            completed_by: user?.id,
          })
          .eq('id', taskId);
      }

      toast({
        title: 'Evidence Submitted',
        description: `Test ${formData.passed ? 'PASSED' : 'FAILED'} - Evidence recorded successfully`,
      });

      // Navigate back or to next task
      navigate('/profile?tab=uat');

    } catch (error) {
      console.error('Error submitting evidence:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit evidence',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            UAT Evidence Submission
          </h1>
          {run && (
            <p className="text-muted-foreground">
              Run: {run.run_code} • {run.organizations?.name}
            </p>
          )}
        </div>
      </div>

      {task && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{task.role_to_test}</Badge>
              {task.deep_link && (
                <a 
                  href={task.deep_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <LinkIcon className="h-3 w-3" />
                  Open Test Page
                </a>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Expected:</strong> {task.expected_result}
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Test Evidence Form
            </CardTitle>
            <CardDescription>
              Document your test results with as much detail as possible
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Used */}
            <div className="space-y-2">
              <Label htmlFor="roleUsed">Role Used *</Label>
              <Select 
                value={formData.roleUsed} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, roleUsed: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the role you tested with" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Performed */}
            <div className="space-y-2">
              <Label htmlFor="actionPerformed">Action Performed *</Label>
              <Textarea
                id="actionPerformed"
                value={formData.actionPerformed}
                onChange={(e) => setFormData(prev => ({ ...prev, actionPerformed: e.target.value }))}
                placeholder="Describe the exact steps you performed..."
                rows={3}
              />
            </div>

            {/* Expected Result */}
            <div className="space-y-2">
              <Label htmlFor="expectedResult">Expected Result</Label>
              <Textarea
                id="expectedResult"
                value={formData.expectedResult}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedResult: e.target.value }))}
                placeholder="What should have happened..."
                rows={2}
              />
            </div>

            {/* Actual Result */}
            <div className="space-y-2">
              <Label htmlFor="actualResult">Actual Result *</Label>
              <Textarea
                id="actualResult"
                value={formData.actualResult}
                onChange={(e) => setFormData(prev => ({ ...prev, actualResult: e.target.value }))}
                placeholder="What actually happened..."
                rows={3}
              />
            </div>

            {/* Evidence Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="screenshotPath" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Screenshot Path/URL
                </Label>
                <Input
                  id="screenshotPath"
                  value={formData.screenshotPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, screenshotPath: e.target.value }))}
                  placeholder="compliance/screenshots/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="downloadLink" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Download/File Link
                </Label>
                <Input
                  id="downloadLink"
                  value={formData.downloadLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, downloadLink: e.target.value }))}
                  placeholder="https://... or storage path"
                />
              </div>
            </div>

            {/* Record IDs */}
            <div className="space-y-2">
              <Label htmlFor="recordIds">Related Record IDs (comma-separated)</Label>
              <Input
                id="recordIds"
                value={formData.recordIds}
                onChange={(e) => setFormData(prev => ({ ...prev, recordIds: e.target.value }))}
                placeholder="uuid-1, uuid-2, ..."
              />
              <p className="text-xs text-muted-foreground">
                Include any relevant database record IDs for audit trail
              </p>
            </div>

            {/* Pass/Fail Toggle */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <Label className="text-base font-medium">Test Result *</Label>
              <div className="flex items-center gap-6">
                <Button
                  type="button"
                  variant={formData.passed === true ? 'default' : 'outline'}
                  className={formData.passed === true ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setFormData(prev => ({ ...prev, passed: true }))}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  PASS
                </Button>
                <Button
                  type="button"
                  variant={formData.passed === false ? 'default' : 'outline'}
                  className={formData.passed === false ? 'bg-destructive hover:bg-destructive/90' : ''}
                  onClick={() => setFormData(prev => ({ ...prev, passed: false }))}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  FAIL
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes / Bug Details</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional context, reproduction steps, or suggested fixes..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Submit Evidence
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default UATEvidenceSubmission;
