import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DeliveryMethod = 'email' | 'sms' | 'whatsapp';
export type VerificationPurpose = 'login' | 'exam_submission';

interface VerificationRequest {
  email: string;
  phone?: string;
  delivery_method: DeliveryMethod;
  purpose: VerificationPurpose;
}

interface VerificationStatus {
  isLoading: boolean;
  isSending: boolean;
  isVerified: boolean;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  verificationId: string | null;
  timeLeft: number;
}

export const useMultiChannelVerification = () => {
  const [status, setStatus] = useState<VerificationStatus>({
    isLoading: false,
    isSending: false,
    isVerified: false,
    deliveryStatus: 'pending',
    verificationId: null,
    timeLeft: 0
  });

  const { toast } = useToast();

  const startVerification = useCallback(async (request: VerificationRequest) => {
    setStatus(prev => ({ ...prev, isSending: true, deliveryStatus: 'pending' }));

    try {
      const { data, error } = await supabase.functions.invoke('vonage-verify-start', {
        body: request
      });

      if (error) throw error;

      setStatus(prev => ({
        ...prev,
        isSending: false,
        deliveryStatus: 'sent',
        verificationId: data.verification_id,
        timeLeft: 300 // 5 minutes
      }));

      const methodLabel = request.delivery_method === 'sms' ? 'SMS' : 
                         request.delivery_method === 'whatsapp' ? 'WhatsApp' : 'Email';
      
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent via ${methodLabel}`,
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error starting verification:', error);
      setStatus(prev => ({
        ...prev,
        isSending: false,
        deliveryStatus: 'failed'
      }));

      toast({
        title: "Delivery Failed",
        description: `Failed to send code via ${request.delivery_method}. Try another method.`,
        variant: "destructive"
      });

      return { success: false, error };
    }
  }, [toast]);

  const checkVerification = useCallback(async (email: string, code: string, purpose: VerificationPurpose) => {
    setStatus(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('vonage-verify-check', {
        body: { 
          email, 
          code, 
          purpose,
          verification_id: status.verificationId
        }
      });

      if (error) throw error;

      if (data.verified) {
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          isVerified: true
        }));

        toast({
          title: "Verification Successful",
          description: "Your identity has been verified",
        });

        return { success: true, verified: true };
      } else {
        setStatus(prev => ({ ...prev, isLoading: false }));
        
        toast({
          title: "Invalid Code",
          description: data.message || "The verification code is incorrect or expired",
          variant: "destructive"
        });

        return { success: false, verified: false, message: data.message };
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Verification Failed",
        description: "Unable to verify code. Please try again.",
        variant: "destructive"
      });

      return { success: false, error };
    }
  }, [status.verificationId, toast]);

  const resetVerification = useCallback(() => {
    setStatus({
      isLoading: false,
      isSending: false,
      isVerified: false,
      deliveryStatus: 'pending',
      verificationId: null,
      timeLeft: 0
    });
  }, []);

  const updateTimeLeft = useCallback((time: number) => {
    setStatus(prev => ({ ...prev, timeLeft: time }));
  }, []);

  return {
    status,
    startVerification,
    checkVerification,
    resetVerification,
    updateTimeLeft
  };
};