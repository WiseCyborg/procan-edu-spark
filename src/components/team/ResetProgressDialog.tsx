import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, RotateCcw, AlertTriangle } from 'lucide-react';

interface ResetProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  onReset?: () => void;
}

export function ResetProgressDialog({
  open,
  onOpenChange,
  employee,
  onReset,
}: ResetProgressDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const expectedConfirmation = 'RESET';

  const handleReset = async () => {
    if (!employee || !user || confirmation !== expectedConfirmation) return;

    setLoading(true);

    try {
      // Delete module progress using RPC or direct query with type assertion
      const { error: progressError } = await supabase
        .from('module_progress' as any)
        .delete()
        .eq('user_id', employee.user_id);

      if (progressError) throw progressError;

      // Delete quiz attempts  
      const { error: quizError } = await supabase
        .from('quiz_attempts' as any)
        .delete()
        .eq('user_id', employee.user_id);

      if (quizError) console.error('Error deleting quiz attempts:', quizError);

      // Delete lesson progress
      const { error: lessonError } = await supabase
        .from('lesson_progress' as any)
        .delete()
        .eq('user_id', employee.user_id);

      if (lessonError) console.error('Error deleting lesson progress:', lessonError);

      // Update user learning journey to reset
      const { error: journeyError } = await supabase
        .from('user_learning_journey')
        .update({
          current_section: 1,
          stoplight_tier: 'green',
          overall_progress_pct: 0,
          at_risk_flag: false,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', employee.user_id);

      if (journeyError) console.error('Error resetting journey:', journeyError);

      toast.success('Progress reset successfully', {
        description: `${employee.first_name} ${employee.last_name}'s training progress has been cleared`,
      });

      setConfirmation('');
      onOpenChange(false);
      onReset?.();
    } catch (error: any) {
      console.error('Error resetting progress:', error);
      toast.error('Failed to reset progress', {
        description: error.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmation('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Reset Employee Progress
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This will permanently delete all training progress for{' '}
              <span className="font-medium text-foreground">
                {employee?.first_name} {employee?.last_name}
              </span>
              , including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>All module completion status</li>
              <li>Quiz attempts and scores</li>
              <li>Lesson progress</li>
              <li>Current tier/section progress</li>
            </ul>
            <p className="text-destructive font-medium">
              This action cannot be undone!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="confirmation">
            Type <span className="font-mono font-bold">{expectedConfirmation}</span> to confirm
          </Label>
          <Input
            id="confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
            placeholder="Type RESET"
            className="font-mono"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={handleClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={loading || confirmation !== expectedConfirmation}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Progress
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
