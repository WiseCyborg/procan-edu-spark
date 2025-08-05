import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MFAVerificationProps {
  email: string;
  purpose: 'login' | 'exam_submission';
  onVerified: () => void;
  onCancel: () => void;
}

export const MFAVerification: React.FC<MFAVerificationProps> = ({
  email,
  purpose,
  onVerified,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    sendVerificationCode();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const sendVerificationCode = async () => {
    setSendingCode(true);
    try {
      const { error } = await supabase.functions.invoke('send-verification-code', {
        body: { email, purpose }
      });

      if (error) throw error;

      setTimeLeft(300); // 5 minutes
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent to ${email}`,
      });
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { email, code, purpose }
      });

      if (error) throw error;

      if (data.verified) {
        onVerified();
        toast({
          title: "Verification Successful",
          description: "Your identity has been verified",
        });
      } else {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect or expired",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: "Verification Failed",
        description: "Unable to verify code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <CardTitle>Email Verification Required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            For security, we've sent a 6-digit verification code to <strong>{email}</strong>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label htmlFor="verification-code" className="text-sm font-medium">
            Enter 6-digit code
          </label>
          <Input
            id="verification-code"
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="text-center text-lg tracking-widest"
          />
        </div>

        {timeLeft > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Code expires in {formatTime(timeLeft)}
          </p>
        )}

        <div className="space-y-2">
          <Button
            onClick={verifyCode}
            disabled={loading || code.length !== 6}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>

          <Button
            variant="outline"
            onClick={sendVerificationCode}
            disabled={sendingCode || timeLeft > 240}
            className="w-full"
          >
            {sendingCode ? 'Sending...' : 'Resend Code'}
          </Button>

          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};