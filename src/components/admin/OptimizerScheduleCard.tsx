import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Calendar, Clock, Mail, Play, Loader2, CheckCircle2 } from 'lucide-react';

export const OptimizerScheduleCard: React.FC = () => {
  const queryClient = useQueryClient();

  const triggerNowMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('trigger_optimizer_now');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('AI Content Optimizer triggered successfully! Analysis will run in the background.');
      queryClient.invalidateQueries({ queryKey: ['curriculum-recommendations'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to trigger optimizer: ${error.message}`);
    },
  });

  const sendDigestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-optimizer-digest');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.emails_sent > 0) {
        toast.success(`Digest email sent to ${data.emails_sent} admin(s)`);
      } else {
        toast.info('No new recommendations to send');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to send digest: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Automated Schedule
            </CardTitle>
            <CardDescription>
              AI optimizer runs automatically every Monday at 9 AM UTC
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-success" />
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Next scheduled run:</strong> Every Monday at 9:00 AM UTC
            <br />
            <span className="text-xs text-muted-foreground">
              Analyzes exam performance and generates content recommendations automatically
            </span>
          </AlertDescription>
        </Alert>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <strong>Email digest:</strong> Sent automatically after analysis
            <br />
            <span className="text-xs text-muted-foreground">
              All admins receive a weekly summary with new recommendations
            </span>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => triggerNowMutation.mutate()}
            disabled={triggerNowMutation.isPending}
            variant="default"
          >
            {triggerNowMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Now
              </>
            )}
          </Button>
          
          <Button
            onClick={() => sendDigestMutation.mutate()}
            disabled={sendDigestMutation.isPending}
            variant="outline"
          >
            {sendDigestMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Digest
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>
            <strong>How it works:</strong> The AI analyzer reviews exam performance data weekly, 
            identifies struggling topics, and generates actionable recommendations. Admins receive 
            an email summary of critical and high-priority items requiring attention.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
