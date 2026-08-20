import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlags {
  multi_role_selector: boolean;
  org_nav_guard: boolean;
  seat_only_content_access: boolean;
  ai_competitor_tables: boolean;
  catalog_enabled: boolean;
  compintel_dashboard: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  multi_role_selector: false,
  org_nav_guard: false,
  seat_only_content_access: false,
  ai_competitor_tables: false,
  catalog_enabled: false,
  compintel_dashboard: false,
};

export const useFeatureFlags = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        // Anonymous visitors may only read global flags whose key starts with
        // `public_` (enforced by RLS). Asking for anything else just produces a
        // guaranteed console error on every public page load.
        let query = supabase
          .from('feature_flags')
          .select('flag_key, flag_value, scope, scope_id');

        if (user?.id) {
          const conditions = ['scope.eq.global'];
          conditions.push(`scope_id.eq.${user.id}`);
          if (organizationId) conditions.push(`scope_id.eq.${organizationId}`);
          query = query.or(conditions.join(','));
        } else {
          query = query.eq('scope', 'global').like('flag_key', 'public_%');
        }

        const { data, error } = await query.order('scope', { ascending: false });

        if (error) throw error;

        const flagMap: Partial<FeatureFlags> = {};
        
        data?.forEach(({ flag_key, flag_value }) => {
          if (flag_key in DEFAULT_FLAGS) {
            flagMap[flag_key as keyof FeatureFlags] = flag_value;
          }
        });

        setFlags({ ...DEFAULT_FLAGS, ...flagMap });
      } catch (error) {
        console.error('Error fetching feature flags:', error);
        setFlags(DEFAULT_FLAGS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlags();
  }, [user?.id, organizationId]);

  return { flags, isLoading };
};
