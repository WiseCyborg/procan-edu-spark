import { useEffect, useState } from 'react';
import { AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'profile-photos';
const MARKER = `/${BUCKET}/`;
const SIGNED_TTL_SECONDS = 60 * 60; // 1 hour

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * The `profile-photos` bucket is PRIVATE. Stored `profile_photo_url` values may be
 * legacy public URLs or plain object paths; both are normalized to an object path
 * and exchanged for a short-lived signed URL that respects storage RLS.
 */
export function toObjectPath(storedUrl?: string | null): string | null {
  if (!storedUrl) return null;
  const withoutQuery = storedUrl.split('?')[0];
  const idx = withoutQuery.indexOf(MARKER);
  if (idx !== -1) return withoutQuery.slice(idx + MARKER.length);
  if (withoutQuery.startsWith('http')) return null;
  return withoutQuery.replace(/^\/+/, '');
}

export async function getSignedProfilePhotoUrl(storedUrl?: string | null): Promise<string | null> {
  const path = toObjectPath(storedUrl);
  if (!path) return null;

  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_TTL_SECONDS - 60) * 1000,
  });
  return data.signedUrl;
}

export function useSignedProfilePhotoUrl(storedUrl?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSignedProfilePhotoUrl(storedUrl).then((signed) => {
      if (active) setUrl(signed);
    });
    return () => {
      active = false;
    };
  }, [storedUrl]);

  return url;
}

interface SignedAvatarImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export const SignedAvatarImage = ({ src, alt, className }: SignedAvatarImageProps) => {
  const signedUrl = useSignedProfilePhotoUrl(src);
  if (!signedUrl) return null;
  return <AvatarImage src={signedUrl} alt={alt} className={className} />;
};
