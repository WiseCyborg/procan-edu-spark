import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Certificate {
  id: string;
  certificate_number: string;
  user_id: string;
  course_id: string;
  issue_date: string;
  expiry_date: string;
  is_revoked: boolean;
  user_name: string;
  user_email: string;
  organization_name: string;
}

export const useCertificateManagement = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'valid' | 'expiring' | 'expired' | 'revoked'>('all');
  const { toast } = useToast();

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          user_id,
          course_id,
          issue_date,
          expiry_date,
          is_revoked,
          profiles!inner(first_name, last_name, organizations(name))
        `)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      const formatted = data?.map(cert => {
        const profile = cert.profiles as any;
        const org = profile?.organizations as any;
        return {
          id: cert.id,
          certificate_number: cert.certificate_number,
          user_id: cert.user_id,
          course_id: cert.course_id,
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          is_revoked: cert.is_revoked,
          user_name: `${profile?.first_name} ${profile?.last_name}`,
          user_email: cert.user_id, // Using user_id instead of email
          organization_name: org?.name || 'No Organization'
        };
      }) || [];

      setCertificates(formatted);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load certificates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeCertificate = async (certificateId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('certificates')
        .update({ is_revoked: true })
        .eq('id', certificateId);

      if (error) throw error;

      toast({
        title: 'Certificate Revoked',
        description: 'Certificate has been successfully revoked'
      });

      fetchCertificates();
    } catch (error) {
      console.error('Error revoking certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke certificate',
        variant: 'destructive'
      });
    }
  };

  const getFilteredCertificates = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return certificates.filter(cert => {
      const expiryDate = new Date(cert.expiry_date);
      
      switch (filter) {
        case 'valid':
          return !cert.is_revoked && expiryDate > thirtyDaysFromNow;
        case 'expiring':
          return !cert.is_revoked && expiryDate <= thirtyDaysFromNow && expiryDate > now;
        case 'expired':
          return !cert.is_revoked && expiryDate <= now;
        case 'revoked':
          return cert.is_revoked;
        default:
          return true;
      }
    });
  };

  const getExpiringCount = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return certificates.filter(cert => {
      const expiryDate = new Date(cert.expiry_date);
      return !cert.is_revoked && expiryDate <= thirtyDaysFromNow && expiryDate > now;
    }).length;
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  return {
    certificates: getFilteredCertificates(),
    loading,
    filter,
    setFilter,
    revokeCertificate,
    refetch: fetchCertificates,
    expiringCount: getExpiringCount()
  };
};
