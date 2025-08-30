import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Smartphone, Mail, Clock, AlertTriangle } from 'lucide-react';
import { useReauthentication } from '@/hooks/useReauthentication';

interface ReauthenticationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  operation: string;
  operationDescription: string;
  urgency?: 'low' | 'medium' | 'high';
}

export const ReauthenticationDialog: React.FC<ReauthenticationDialogProps> = ({
  open,
  onClose,
  onSuccess,
  operation,
  operationDescription,
  urgency = 'medium'
}) => {
  const { initiateReauth, verifyReauth, status } = useReauthentication();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'sms'>('email');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCode('');
      setVerificationStarted(false);
      setTimeLeft(300);
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!verificationStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [verificationStarted, timeLeft]);

  const handleStartVerification = async (method: 'email' | 'sms') => {
    setLoading(true);
    setSelectedMethod(method);
    
    const result = await initiateReauth(operation, method);
    
    if (result.success) {
      setVerificationStarted(true);
      setTimeLeft(300); // Reset timer
    }
    
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) return;
    
    setLoading(true);
    
    const result = await verifyReauth(operation, code, selectedMethod);
    
    if (result.success) {
      onSuccess();
      onClose();
    }
    
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUrgencyColor = () => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getUrgencyIcon = () => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Shield className="h-4 w-4" />;
      case 'low': return <Clock className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Re-authentication Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Operation Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Sensitive Operation</p>
                <Badge variant={getUrgencyColor()} className="flex items-center gap-1">
                  {getUrgencyIcon()}
                  {urgency} priority
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{operationDescription}</p>
            </CardContent>
          </Card>

          {!verificationStarted ? (
            /* Method Selection */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose your verification method:
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleStartVerification('sms')}
                  disabled={loading}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Smartphone className="h-5 w-5" />
                  <span className="text-xs">SMS Text</span>
                  <span className="text-xs text-muted-foreground">Fastest</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleStartVerification('email')}
                  disabled={loading}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-xs">Email</span>
                  <span className="text-xs text-muted-foreground">Reliable</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Code Entry */
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {selectedMethod === 'sms' ? (
                    <Smartphone className="h-4 w-4 text-primary" />
                  ) : (
                    <Mail className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-medium">
                    Code sent via {selectedMethod === 'sms' ? 'SMS' : 'Email'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit verification code
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP 
                  value={code} 
                  onChange={setCode}
                  maxLength={6}
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

              {/* Timer */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Code expires in: <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setVerificationStarted(false)}
                  className="flex-1"
                >
                  Change Method
                </Button>
                <Button 
                  onClick={handleVerifyCode}
                  disabled={code.length !== 6 || loading}
                  className="flex-1"
                >
                  Verify & Proceed
                </Button>
              </div>

              {/* Security Notice */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This verification will be valid for 30 minutes for similar operations.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};