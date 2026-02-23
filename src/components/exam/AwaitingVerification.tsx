import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface AwaitingVerificationProps {
  checkinId: string;
  attemptId: string;
  onVerified: () => void;
}

export const AwaitingVerification: React.FC<AwaitingVerificationProps> = ({
  checkinId,
  attemptId,
  onVerified,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [showSelfAttest, setShowSelfAttest] = useState(false);
  const [bypassReason, setBypassReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Real-time subscription for verification status
  useEffect(() => {
    const channel = supabase
      .channel(`exam-checkin-${attemptId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_checkins',
          filter: `attempt_id=eq.${attemptId}`,
        },
        (payload) => {
          const status = (payload.new as any).status;
          if (status === 'verified' || status === 'bypassed') {
            toast.success(
              status === 'verified'
                ? 'Identity verified by manager! You may now start the exam.'
                : 'Self-attestation recorded. You may now start the exam.'
            );
            onVerified();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [attemptId, onVerified]);

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSelfAttest = async () => {
    if (!bypassReason.trim()) {
      toast.error('Please provide a reason for self-attestation');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('exam_checkins')
        .update({
          status: 'bypassed',
          bypass_reason: bypassReason.trim(),
        })
        .eq('id', checkinId);

      if (error) throw error;

      // The realtime subscription will handle the transition
    } catch (error) {
      console.error('Self-attest error:', error);
      toast.error('Failed to submit self-attestation. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <ShieldCheck className="h-12 w-12 text-primary" />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 rounded-full animate-pulse" />
          </div>
        </div>
        <CardTitle className="text-xl">Awaiting Manager Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-muted-foreground text-sm">
          Your identity check-in has been submitted. A manager will verify you shortly.
        </p>

        {/* Waiting indicator */}
        <div className="flex items-center justify-center gap-2 py-3 bg-muted rounded-lg">
          <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
          <span className="text-sm font-mono text-muted-foreground">
            Waiting: {formatElapsed(elapsed)}
          </span>
        </div>

        <Alert className="border-primary/30 bg-primary/5">
          <UserCheck className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            This page will update automatically when your manager verifies your identity. No need to refresh.
          </AlertDescription>
        </Alert>

        {/* Self-attest fallback */}
        <div className="border-t pt-4">
          {!showSelfAttest ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowSelfAttest(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              No manager available? Self-attest instead
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Self-attestation will be flagged in the audit trail. A manager should verify when available.
              </p>
              <Input
                placeholder="Reason (e.g., no manager on-site today)"
                value={bypassReason}
                onChange={(e) => setBypassReason(e.target.value)}
                className="h-10 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSelfAttest(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSelfAttest}
                  disabled={submitting || !bypassReason.trim()}
                  className="flex-1"
                >
                  {submitting ? 'Submitting...' : 'Self-Attest'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
