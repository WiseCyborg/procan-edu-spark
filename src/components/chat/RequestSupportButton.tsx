import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Phone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RequestSupportButtonProps {
  defaultSubject?: string;
  conversationId?: string;
}

export const RequestSupportButton = ({ defaultSubject, conversationId }: RequestSupportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please describe what you need help with.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('request-procann-support', {
        body: {
          requestType: 'chat_escalation',
          priority,
          subject: defaultSubject || 'Chatbot Escalation - Need Human Help',
          description: description.trim(),
          conversationId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Support Request Sent',
          description: 'A ProCann team member will reach out to you shortly. Average response time: under 30 minutes.',
        });
        setIsOpen(false);
        setDescription('');
        setPriority('medium');
      } else {
        throw new Error(data?.error || 'Failed to create support request');
      }
    } catch (error: any) {
      console.error('Error requesting support:', error);
      toast({
        title: 'Request Failed',
        description: error.message || 'Unable to send support request. Please try again.',
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
        <Phone className="h-4 w-4" />
        Request Live Support
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request ProCann Support</DialogTitle>
            <DialogDescription>
              Our team will be notified immediately and will reach out to help you. Average response time is under 30 minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - General question</SelectItem>
                  <SelectItem value="medium">Medium - Need guidance</SelectItem>
                  <SelectItem value="high">High - Blocking issue</SelectItem>
                  <SelectItem value="urgent">Urgent - Critical problem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">What do you need help with?</Label>
              <Textarea
                id="description"
                placeholder="Describe your issue or question in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
