import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CertificateResult {
  eligible: boolean;
  reason: string;
  issued: boolean;
  completion_percent?: number;
  required_percent?: number;
  quiz_score?: number;
  required_score?: number;
  certificate: {
    id: string;
    verification_code: string;
    certificate_name: string;
    issued_at: string;
    pdf_url?: string;
    recipient_name?: string;
  } | null;
}

interface IssueCertificateParams {
  courseId: string;
  guestEmail?: string;
  recipientName?: string;
}

export const useCertificateIssuance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, guestEmail, recipientName }: IssueCertificateParams): Promise<CertificateResult> => {
      const { data, error } = await supabase.rpc('evaluate_and_issue_certificate', {
        p_course_id: courseId,
        p_guest_email: guestEmail || null,
        p_recipient_name: recipientName || null
      });

      if (error) {
        console.error('[useCertificateIssuance] Error:', error);
        throw new Error('Failed to issue certificate');
      }

      return data as unknown as CertificateResult;
    },
    onSuccess: (data) => {
      if (data.issued && data.certificate) {
        toast.success('Certificate issued!', {
          description: `Your verification code: ${data.certificate.verification_code}`
        });
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['course-launch-target'] });
        queryClient.invalidateQueries({ queryKey: ['user-certificates'] });
      }
    },
    onError: (error) => {
      console.error('[useCertificateIssuance] Mutation error:', error);
      toast.error('Failed to issue certificate. Please try again.');
    }
  });
};

export const useVerifyCertificate = () => {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('verify_certificate', {
        p_code: code
      });

      if (error) {
        console.error('[useVerifyCertificate] Error:', error);
        throw new Error('Failed to verify certificate');
      }

      return data;
    }
  });
};
