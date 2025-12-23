import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface VersionMismatch {
  id: string;
  user_id: string;
  course_id: string;
  trained_version_id: string | null;
  current_version_id: string | null;
  retraining_required: boolean;
  created_at: string;
  trained_version?: {
    version_number: string;
  };
  current_version?: {
    version_number: string;
  };
  courses?: {
    title: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export const VersionMismatchAlert = ({ organizationId }: { organizationId?: string }) => {
  const { data: mismatches, isLoading } = useQuery({
    queryKey: ['version-mismatches', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_version_mismatches')
        .select(`*, courses (title)`)
        .eq('retraining_required', true)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch profiles separately
      const mismatchesWithProfiles = await Promise.all(
        (data || []).map(async (mismatch) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', mismatch.user_id)
            .single();
          return { ...mismatch, profiles: profile } as VersionMismatch;
        })
      );
      return mismatchesWithProfiles;
    },
    refetchInterval: 120000,
  });

  if (isLoading || !mismatches || mismatches.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Curriculum Version Mismatches
        <Badge variant="destructive">{mismatches.length}</Badge>
      </AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          The following employees were trained on an older curriculum version and may need retraining:
        </p>
        <ul className="space-y-1">
          {mismatches.slice(0, 5).map((mismatch) => (
            <li key={mismatch.id} className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-3 w-3" />
              <span>
                {mismatch.profiles?.first_name} {mismatch.profiles?.last_name} - {mismatch.courses?.title}
              </span>
            </li>
          ))}
          {mismatches.length > 5 && (
            <li className="text-sm text-muted-foreground">
              ...and {mismatches.length - 5} more
            </li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  );
};
