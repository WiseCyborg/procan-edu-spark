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
      // Step 1: Fetch all certificates
      const { data: certsData, error: certsError } = await supabase
        .from('certificates')
        .select('*')
        .order('issue_date', { ascending: false });

      if (certsError) throw certsError;

      // If no certificates, return empty array (not an error)
      if (!certsData || certsData.length === 0) {
        setCertificates([]);
        setLoading(false);
        return;
      }

      // Step 2: Get unique user_ids from certificates
      const userIds = [...new Set(certsData.map(c => c.user_id))];

      // Step 3: Fetch profiles for those users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, organization_id, email_cache')
        .in('user_id', userIds);

      // Step 4: Get unique organization_ids from profiles
      const orgIds = [...new Set(profilesData?.map(p => p.organization_id).filter(Boolean) || [])];

      // Step 5: Fetch organizations (only if we have org IDs)
      const { data: orgsData } = orgIds.length > 0 
        ? await supabase
            .from('organizations')
            .select('id, name')
            .in('id', orgIds)
        : { data: [] };

      // Create lookup maps for efficient data combination
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p] as const) || []);
      const orgMap = new Map(orgsData?.map(o => [o.id, o.name] as const) || []);

      // Step 6: Combine all data
      const formatted = certsData.map(cert => {
        const profile = profileMap.get(cert.user_id);
        const orgName = profile?.organization_id ? orgMap.get(profile.organization_id) : null;
        
        return {
          id: cert.id,
          certificate_number: cert.certificate_number,
          user_id: cert.user_id,
          course_id: cert.course_id,
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          is_revoked: cert.is_revoked,
          user_name: profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User'
            : 'Unknown User',
          user_email: profile?.email_cache || cert.user_id,
          organization_name: (orgName || 'No Organization') as string
        };
      });

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
