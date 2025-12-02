import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InviteProCannSupportProps {
  conversationId: string;
  conversationTitle?: string;
}

export const InviteProCannSupport = ({ conversationId, conversationTitle }: InviteProCannSupportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please explain why you need ProCann support.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('request-procann-support', {
        body: {
          requestType: 'video_call_request',
          priority: 'high',
          subject: `Support Request for: ${conversationTitle || 'Team Discussion'}`,
          description: description.trim(),
          conversationId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'ProCann Team Notified',
          description: 'A ProCann expert will join your conversation shortly to assist.',
        });
        setIsOpen(false);
        setDescription('');
      } else {
        throw new Error(data?.error || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Error inviting support:', error);
      toast({
        title: 'Invitation Failed',
        description: error.message || 'Unable to notify ProCann team. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Invite ProCann Support
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite ProCann Expert to Call</DialogTitle>
            <DialogDescription>
              Request a ProCann team member to join your team discussion or video call for expert guidance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Why do you need ProCann support?</Label>
              <Textarea
                id="reason"
                placeholder="Example: Need clarification on new compliance regulations, have questions about training best practices, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Average response time: 15-30 minutes during business hours
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
