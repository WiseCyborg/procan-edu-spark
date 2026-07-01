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
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  enrollmentId?: string | null;
  completedModuleIds?: string[];
}

export const EmailCaptureModal = ({
  open,
  onOpenChange,
  courseId,
  enrollmentId,
  completedModuleIds = [],
}: EmailCaptureModalProps) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { sessionId, updateEmail } = useGuestSession();
  const { user } = useAuth();
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
      const nowIso = new Date().toISOString();
      let targetEnrollmentId: string | null = enrollmentId ?? null;

      // 1) If we know the existing enrollment, UPDATE it (do NOT create a duplicate).
      if (targetEnrollmentId) {
        const { data: current } = await supabase
          .from('consumer_enrollments')
          .select('metadata, completed_at')
          .eq('id', targetEnrollmentId)
          .maybeSingle();

        const currentMeta = (current?.metadata as Record<string, any>) || {};
        const mergedMeta = {
          ...currentMeta,
          name: name || currentMeta.name,
          completedModules: Array.isArray(currentMeta.completedModules) && currentMeta.completedModules.length > 0
            ? currentMeta.completedModules
            : completedModuleIds,
          completedAt: current?.completed_at ?? currentMeta.completedAt ?? nowIso,
        };

        const { error: updErr } = await supabase
          .from('consumer_enrollments')
          .update({
            email,
            completed_at: current?.completed_at ?? nowIso,
            metadata: mergedMeta as any,
          })
          .eq('id', targetEnrollmentId);
        if (updErr) throw updErr;
      } else if (user?.id) {
        // 2) Authenticated but no enrollment id passed — find or create the row for this user+course.
        const { data: existing } = await supabase
          .from('consumer_enrollments')
          .select('id, metadata, completed_at')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        if (existing) {
          targetEnrollmentId = existing.id;
          const currentMeta = (existing.metadata as Record<string, any>) || {};
          await supabase
            .from('consumer_enrollments')
            .update({
              email,
              completed_at: existing.completed_at ?? nowIso,
              metadata: {
                ...currentMeta,
                name: name || currentMeta.name,
                completedModules: Array.isArray(currentMeta.completedModules) && currentMeta.completedModules.length > 0
                  ? currentMeta.completedModules
                  : completedModuleIds,
                completedAt: existing.completed_at ?? currentMeta.completedAt ?? nowIso,
              } as any,
            })
            .eq('id', existing.id);
        } else {
          const { data: created, error: insErr } = await supabase
            .from('consumer_enrollments')
            .insert({
              user_id: user.id,
              session_id: sessionId || undefined,
              course_id: courseId,
              email,
              completed_at: nowIso,
              metadata: {
                courseId,
                name: name || undefined,
                completedModules: completedModuleIds,
                completedAt: nowIso,
              } as any,
            })
            .select('id')
            .single();
          if (insErr) throw insErr;
          targetEnrollmentId = created.id;
        }
      } else {
        // 3) Guest with no known enrollment — create one with the ACTUAL completion state,
        //    not a blank shell.
        const { data: created, error: insErr } = await supabase
          .from('consumer_enrollments')
          .insert({
            session_id: sessionId || undefined,
            course_id: courseId,
            email,
            completed_at: nowIso,
            metadata: {
              courseId,
              name: name || undefined,
              completedModules: completedModuleIds,
              completedAt: nowIso,
            } as any,
          })
          .select('id')
          .single();
        if (insErr) throw insErr;
        targetEnrollmentId = created.id;
      }

      // Update guest session with email
      updateEmail(email);

      // Generate consumer certificate against the REAL enrollment id
      if (targetEnrollmentId) {
        try {
          const { data: certData, error: certError } = await supabase.functions.invoke(
            'generate-consumer-certificate',
            {
              body: {
                enrollment_id: targetEnrollmentId,
                email: email,
                name: name || undefined,
                course_id: courseId,
              }
            }
          );

          if (certError) {
            console.error('Certificate generation error:', certError);
          } else {
            console.log('Certificate generated:', certData?.certificate?.certificate_number);
          }
        } catch (certError) {
          console.error('Failed to generate certificate:', certError);
        }
      }

      toast({
        title: 'Success! 🎉',
        description: 'Your certificate will be sent to your email shortly.',
      });

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
