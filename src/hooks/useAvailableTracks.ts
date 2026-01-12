import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TRACK_IDS, TRACKS, TrackInfo, getTrackById } from '@/constants/tracks';

export interface TrackStatus {
  trackInfo: TrackInfo;
  courseId: string;
  isAccessible: boolean;
  prerequisiteMet: boolean;
  prerequisiteRecommended: boolean;
  hasCertificate: boolean;
  modulesCompleted: number;
  totalModules: number;
  progress: number;
}

interface UseAvailableTracksReturn {
  tracks: TrackStatus[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to get all available tracks and user's status for each.
 * Each track has isolated progress and resume state.
 */
export const useAvailableTracks = (): UseAvailableTracksReturn => {
  const { user } = useAuth();

  const { data: tracks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['available-tracks', user?.id],
    queryFn: async (): Promise<TrackStatus[]> => {
      if (!user?.id) return [];

      const trackIds = Object.values(TRACK_IDS);
      const results: TrackStatus[] = [];

      // Fetch access snapshot for each track
      for (const courseId of trackIds) {
        try {
          const { data, error: rpcError } = await supabase.rpc('get_access_snapshot', {
            p_course_id: courseId,
          });

          if (rpcError) {
            console.error(`[useAvailableTracks] Error for ${courseId}:`, rpcError);
            continue;
          }

          const snapshot = data as unknown as {
            can_access_course: boolean;
            deny_reason: string | null;
            has_certificate: boolean;
            modules_completed: number;
            total_modules: number;
            prerequisite_info: {
              can_access: boolean;
              has_prerequisite: boolean;
              prerequisite_completed: boolean;
              prerequisite_recommended: boolean;
            };
          };

          const trackInfo = getTrackById(courseId);
          if (!trackInfo) continue;

          const prereqInfo = snapshot?.prerequisite_info || {
            can_access: true,
            has_prerequisite: false,
            prerequisite_completed: false,
            prerequisite_recommended: false,
          };

          const modulesCompleted = snapshot?.modules_completed || 0;
          const totalModules = snapshot?.total_modules || 0;
          const progress = totalModules > 0 ? Math.round((modulesCompleted / totalModules) * 100) : 0;

          results.push({
            trackInfo,
            courseId,
            isAccessible: snapshot?.can_access_course ?? false,
            prerequisiteMet: prereqInfo.prerequisite_completed || !prereqInfo.has_prerequisite,
            prerequisiteRecommended: prereqInfo.prerequisite_recommended || false,
            hasCertificate: snapshot?.has_certificate ?? false,
            modulesCompleted,
            totalModules,
            progress,
          });
        } catch (e) {
          console.error(`[useAvailableTracks] Unexpected error for ${courseId}:`, e);
        }
      }

      return results;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    tracks,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

/**
 * Get single track status
 */
export const useTrackStatus = (courseId: string) => {
  const { tracks, isLoading, error } = useAvailableTracks();
  const track = tracks.find(t => t.courseId === courseId);
  
  return {
    track: track ?? null,
    isLoading,
    error,
  };
};
