import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Zap, Smartphone, Clock, ArrowLeft } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuickPinEntryProps {
  email: string;
  phone: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const QuickPinEntry: React.FC<QuickPinEntryProps> = ({
  email,
  phone,
  onVerified,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [autoSent, setAutoSent] = useState(false);
  const { toast } = useToast();

  // Auto-send SMS on mount
  useEffect(() => {
    if (!autoSent) {
      sendQuickPin();
      setAutoSent(true);
    }
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const sendQuickPin = async () => {
    setSendingCode(true);

    try {
      const { data, error } = await supabase.functions.invoke('vonage-verify-start', {
        body: {
          email,
          phone,
          delivery_method: 'sms',
          purpose: 'login'
        }
      });

      if (error) throw error;

      setVerificationId(data.verification_id);
      setTimeLeft(300); // 5 minutes
      
      toast({
        title: "Quick PIN Sent",
        description: "6-digit PIN sent via SMS for quick admin access",
      });
    } catch (error) {
      console.error('Error sending quick PIN:', error);
      toast({
        title: "PIN Send Failed",
        description: "Failed to send quick PIN. Please try standard login.",
        variant: "destructive"
      });
    } finally {
      setSendingCode(false);
    }
  };

  const verifyPin = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 6-digit PIN",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vonage-verify-check', {
        body: { 
          email, 
          code, 
          purpose: 'login',
          verification_id: verificationId
        }
      });

      if (error) throw error;

      if (data.verified) {
        onVerified();
        toast({
          title: "Quick Entry Successful",
          description: "Welcome back! You're now signed in.",
        });
      } else {
        toast({
          title: "Invalid PIN",
          description: data.message || "The PIN is incorrect or expired",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      toast({
        title: "Verification Failed",
        description: "Unable to verify PIN. Please try again.",
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

  const maskPhone = (phoneNumber: string) => {
    if (phoneNumber.length < 4) return phoneNumber;
    return phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-emerald-100 rounded-full">
            <Zap className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          Admin Quick Entry
          <Badge variant="default" className="bg-emerald-600">FAST</Badge>
        </CardTitle>
        <p className="text-muted-foreground">
          Enter the 6-digit PIN sent to your phone for instant access
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone Info */}
        <Alert className="border-emerald-200 bg-emerald-50">
          <Smartphone className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700">
            PIN sent to {maskPhone(phone)}
          </AlertDescription>
        </Alert>

        {/* PIN Input */}
        <div className="space-y-4">
          <div className="text-center">
            <label className="text-sm font-medium text-foreground">
              Enter 6-digit PIN
            </label>
          </div>
          
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={verifyPin}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {timeLeft > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              PIN expires in {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={verifyPin}
            disabled={loading || code.length !== 6}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {loading ? 'Verifying...' : 'Quick Entry'}
            <Zap className="w-4 h-4 ml-2" />
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={sendQuickPin}
              disabled={sendingCode || timeLeft > 240}
              size="sm"
            >
              {sendingCode ? 'Sending...' : 'Resend PIN'}
            </Button>

            <Button
              variant="outline"
              onClick={onCancel}
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          <p>Quick Entry uses SMS verification for instant admin access.</p>
          <p>This feature is available to administrators with SMS preferences enabled.</p>
        </div>
      </CardContent>
    </Card>
  );
};