import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Mail, Loader2 } from 'lucide-react';
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

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
}

export const EmailCaptureModal = ({
  open,
  onOpenChange,
  courseId
}: EmailCaptureModalProps) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { sessionId, updateEmail } = useGuestSession();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save enrollment with email
      const { error } = await supabase
        .from('consumer_enrollments')
        .insert({
          session_id: sessionId || undefined,
          course_id: courseId,
          email,
          completed_at: new Date().toISOString(),
          metadata: { name: name || undefined }
        });

      if (error) throw error;

      // Update guest session with email
      updateEmail(email);

      toast({
        title: 'Success! 🎉',
        description: 'Your certificate will be sent to your email shortly.',
      });

      // Close modal and navigate to certificates page
      onOpenChange(false);
      navigate(`/consumer-certificates?course=${courseId}`);
    } catch (error) {
      console.error('Error saving enrollment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your information. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    navigate(`/consumer-certificates?course=${courseId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Congratulations! 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            You've completed the course! Enter your email to receive your certificate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              placeholder="Your name for the certificate"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              We'll send your certificate here. We won't spam you.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Get My Certificate
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="w-full"
            >
              Skip for now
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
