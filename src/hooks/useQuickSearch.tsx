import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuickSearchResult {
  id: string;
  type: 'user' | 'organization' | 'certificate' | 'application';
  primary_text: string;
  secondary_text: string;
  status?: string;
  metadata?: any;
}

export const useQuickSearch = () => {
  const [results, setResults] = useState<QuickSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchTerm = `%${term}%`;
      const allResults: QuickSearchResult[] = [];

      // Search users (Note: email is not in profiles, showing user_id instead)
      const { data: users } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, organization_id')
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
        .limit(5);

      if (users) {
        allResults.push(...users.map(u => ({
          id: u.user_id,
          type: 'user' as const,
          primary_text: `${u.first_name} ${u.last_name}`,
          secondary_text: u.user_id, // Using user_id as identifier since email isn't in profiles
          status: 'active',
          metadata: u
        })));
      }

      // Search organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, unique_access_key, license_number, payment_status')
        .or(`name.ilike.${searchTerm},unique_access_key.ilike.${searchTerm},license_number.ilike.${searchTerm}`)
        .limit(5);

      if (orgs) {
        allResults.push(...orgs.map(o => ({
          id: o.id,
          type: 'organization' as const,
          primary_text: o.name,
          secondary_text: o.license_number || o.unique_access_key,
          status: o.payment_status,
          metadata: o
        })));
      }

      // Search certificates
      const { data: certs } = await supabase
        .from('certificates')
        .select(`
          id, 
          certificate_number, 
          user_id, 
          is_revoked, 
          expiry_date,
          profiles!inner(first_name, last_name)
        `)
        .ilike('certificate_number', searchTerm)
        .limit(5);

      if (certs) {
        allResults.push(...certs.map(c => {
          const profile = c.profiles as any;
          return {
            id: c.id,
            type: 'certificate' as const,
            primary_text: c.certificate_number,
            secondary_text: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
            status: c.is_revoked 
              ? 'revoked' 
              : new Date(c.expiry_date) < new Date() 
                ? 'expired' 
                : new Date(c.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  ? 'expiring'
                  : 'valid',
            metadata: c
          };
        }));
      }

      // Search applications
      const { data: apps } = await supabase
        .from('dispensary_applications')
        .select('id, organization_name, contact_email, contact_person, application_status')
        .or(`organization_name.ilike.${searchTerm},contact_email.ilike.${searchTerm}`)
        .limit(5);

      if (apps) {
        allResults.push(...apps.map(a => ({
          id: a.id,
          type: 'application' as const,
          primary_text: a.organization_name,
          secondary_text: a.contact_email,
          status: a.application_status,
          metadata: a
        })));
      }

      setResults(allResults);
    } catch (error) {
      console.error('Quick search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, search, clearResults: () => setResults([]) };
};
