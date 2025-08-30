import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Mail, Smartphone, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnhancedMFAVerificationProps {
  email: string;
  phone?: string;
  purpose: 'login' | 'exam_submission';
  onVerified: () => void;
  onCancel: () => void;
}

type DeliveryMethod = 'email' | 'sms' | 'whatsapp';

export const EnhancedMFAVerification: React.FC<EnhancedMFAVerificationProps> = ({
  email,
  phone,
  purpose,
  onVerified,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('email');
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(phone || '');
  const [deliveryStatus, setDeliveryStatus] = useState<'pending' | 'sent' | 'failed'>('pending');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const { toast } = useToast();

  const deliveryOptions = [
    { value: 'email', label: 'Email', icon: Mail, description: `Send to ${email}` },
    ...(phone || currentPhoneNumber ? [
      { value: 'sms' as const, label: 'SMS Text', icon: Smartphone, description: `Send to ${phone || currentPhoneNumber}` },
      { value: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare, description: `Send to ${phone || currentPhoneNumber}` }
    ] : [])
  ];

  useEffect(() => {
    if (deliveryOptions.length === 1) {
      sendVerificationCode();
    }
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const sendVerificationCode = async () => {
    if (deliveryMethod !== 'email' && !currentPhoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number for SMS or WhatsApp verification",
        variant: "destructive"
      });
      return;
    }

    setSendingCode(true);
    setDeliveryStatus('pending');

    try {
      const requestBody = {
        email,
        purpose,
        delivery_method: deliveryMethod,
        ...(deliveryMethod !== 'email' && { phone: currentPhoneNumber })
      };

      const { data, error } = await supabase.functions.invoke('vonage-verify-start', {
        body: requestBody
      });

      if (error) throw error;

      setVerificationId(data.verification_id);
      setTimeLeft(300); // 5 minutes
      setDeliveryStatus('sent');
      
      const methodLabel = deliveryOptions.find(opt => opt.value === deliveryMethod)?.label || deliveryMethod;
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent via ${methodLabel}`,
      });
    } catch (error) {
      console.error('Error sending verification code:', error);
      setDeliveryStatus('failed');
      toast({
        title: "Delivery Failed",
        description: `Failed to send code via ${deliveryMethod}. Try another method or contact support.`,
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
      const { data, error } = await supabase.functions.invoke('vonage-verify-check', {
        body: { 
          email, 
          code, 
          purpose,
          verification_id: verificationId
        }
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
          description: data.message || "The verification code is incorrect or expired",
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

  const handleMethodChange = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    setCode('');
    setDeliveryStatus('pending');
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDeliveryStatusIcon = () => {
    switch (deliveryStatus) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <div className="h-4 w-4 rounded-full bg-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <CardTitle>Multi-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Method Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Choose verification method</label>
          <Select value={deliveryMethod} onValueChange={handleMethodChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deliveryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Phone Number Input for SMS/WhatsApp */}
        {(deliveryMethod === 'sms' || deliveryMethod === 'whatsapp') && (
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              value={currentPhoneNumber}
              onChange={(e) => setCurrentPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="text-base"
            />
          </div>
        )}

        {/* Send Code Button */}
        {deliveryStatus === 'pending' && (
          <Button
            onClick={sendVerificationCode}
            disabled={sendingCode || (deliveryMethod !== 'email' && !currentPhoneNumber)}
            className="w-full"
          >
            {sendingCode ? 'Sending...' : `Send Code via ${deliveryOptions.find(opt => opt.value === deliveryMethod)?.label}`}
          </Button>
        )}

        {/* Delivery Status */}
        {deliveryStatus !== 'pending' && (
          <Alert className={deliveryStatus === 'failed' ? 'border-red-200 bg-red-50' : ''}>
            <div className="flex items-center gap-2">
              {getDeliveryStatusIcon()}
              <AlertDescription>
                {deliveryStatus === 'sent' 
                  ? `Code sent via ${deliveryOptions.find(opt => opt.value === deliveryMethod)?.label}` 
                  : 'Delivery failed - try another method'
                }
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Code Input */}
        {deliveryStatus === 'sent' && (
          <>
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
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Code expires in {formatTime(timeLeft)}
              </div>
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
            </div>
          </>
        )}

        {/* Method Switching */}
        {deliveryStatus === 'failed' && deliveryOptions.length > 1 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Having trouble? Try a different method:
            </p>
            <div className="flex gap-2 justify-center">
              {deliveryOptions
                .filter(option => option.value !== deliveryMethod)
                .map((option) => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleMethodChange(option.value as DeliveryMethod)}
                    className="flex items-center gap-1"
                  >
                    <option.icon className="h-3 w-3" />
                    {option.label}
                  </Button>
                ))}
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full"
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};