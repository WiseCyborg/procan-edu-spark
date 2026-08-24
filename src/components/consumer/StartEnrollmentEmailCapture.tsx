import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGuestSession } from '@/hooks/useGuestSession';
import { supabase } from '@/integrations/supabase/client';

interface StartEnrollmentEmailCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
}

const dismissedKey = (courseId: string) => `procann_start_capture_dismissed_${courseId}`;

export const StartEnrollmentEmailCapture = ({
  open,
  onOpenChange,
  courseId,
  courseTitle,
}: StartEnrollmentEmailCaptureProps) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { sessionId, updateEmail } = useGuestSession();

  const close = () => onOpenChange(false);

  const handleSkip = () => {
    try {
      localStorage.setItem(dismissedKey(courseId), '1');
    } catch (e) {
      console.error('Error setting dismissal flag:', e);
    }
    close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-consumer-enrollment', {
        body: {
          course_id: courseId,
          session_id: sessionId || undefined,
          email,
          name: name || undefined,
        },
      });

      if (error || data?.success === false) {
        throw new Error(error?.message || data?.error || 'Unknown error');
      }

      updateEmail(email);
      try {
        localStorage.setItem(dismissedKey(courseId), '1');
      } catch (e) {
        console.error('Error setting dismissal flag:', e);
      }

      toast({
        title: "You're all set",
        description: "We'll save your progress on this course.",
      });
      close();
    } catch (error) {
      console.error('Error starting enrollment:', error);
      // Fail open — never block a guest from the free course over this.
      toast({
        title: 'Could not save your email',
        description: 'No problem — you can keep going, your progress will just live on this device.',
      });
      close();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Save your spot</DialogTitle>
          <DialogDescription className="text-center">
            {`Starting "${courseTitle}" — this course is completely free. Leave your email so we can save your progress and send your completion badge when you're done.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-name">Name (Optional)</Label>
            <Input
              id="start-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-email">Email Address</Label>
            <Input
              id="start-email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll never spam you. This course stays free either way.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save My Spot'
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={handleSkip} disabled={isSubmitting} className="w-full">
              Continue without saving progress
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
