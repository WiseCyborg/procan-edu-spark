import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SignedVideoResponse {
  success: boolean;
  error_code?: string;
  url?: string;
  provider?: 'supabase' | 'vimeo';
  vimeo_id?: string;
  vimeo_hash?: string | null;
  expires_at?: string | null;
  title?: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
}


async function fetchSignedUrl(assetKey: string): Promise<SignedVideoResponse> {
  const { data, error } = await supabase.functions.invoke('get-video-url', {
    body: { assetKey },
  });
  if (error) {
    return { success: false, error_code: 'request_failed' };
  }
  return data as SignedVideoResponse;
}

/**
 * Returns a short-lived signed URL for a private training video,
 * refreshing it ~30s before expiry so playback never breaks.
 */
export function useSignedVideoUrl(assetKey: string, enabled = true) {
  const [refreshTick, setRefreshTick] = useState(0);

  const query = useQuery({
    queryKey: ['signed-video-url', assetKey, refreshTick],
    queryFn: () => fetchSignedUrl(assetKey),
    enabled: enabled && !!assetKey,
    staleTime: 0,
    gcTime: 0,
  });

  // Schedule refresh ~30s before expiry
  useEffect(() => {
    if (!query.data?.success || !query.data.expires_at) return;
    const msUntilExpiry = new Date(query.data.expires_at).getTime() - Date.now();
    const refreshIn = Math.max(msUntilExpiry - 30_000, 10_000);
    const t = window.setTimeout(() => setRefreshTick((n) => n + 1), refreshIn);
    return () => window.clearTimeout(t);
  }, [query.data]);

  return query;
}
