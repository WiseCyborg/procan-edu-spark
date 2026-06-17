import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { Play, Lock, AlertCircle, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedVideoUrl } from '@/hooks/useSignedVideoUrl';
import { cn } from '@/lib/utils';


interface SecureVideoPlayerProps {
  assetKey: string;
  className?: string;
  poster?: string;
  onComplete?: () => void;
  /** Fraction of duration that counts as "watched" (default 0.9) */
  completionThreshold?: number;
  /** Show a tap-to-play overlay before requesting the URL */
  lazy?: boolean;
}

/**
 * HTML5 video player that streams from a private Supabase Storage bucket
 * via short-lived signed URLs. Access is enforced by the get-video-url
 * edge function (public / authenticated / enrolled).
 */
export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  assetKey,
  className,
  poster,
  onComplete,
  completionThreshold = 0.9,
  lazy = true,
}) => {
  const [activated, setActivated] = useState(!lazy);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);

  const { data, isLoading, isError, refetch } = useSignedVideoUrl(assetKey, activated);

  // Reload <video> when URL refreshes mid-playback, preserving currentTime
  useEffect(() => {
    if (!data?.url || !videoRef.current) return;
    const v = videoRef.current;
    if (v.src === data.url) return;
    const wasPlaying = !v.paused;
    const t = v.currentTime;
    v.src = data.url;
    v.currentTime = t;
    if (wasPlaying) v.play().catch(() => {});
  }, [data?.url]);

  const handleTimeUpdate = () => {
    if (completedRef.current || !onComplete) return;
    const v = videoRef.current;
    if (!v || !v.duration) return;
    if (v.currentTime / v.duration >= completionThreshold) {
      completedRef.current = true;
      onComplete();
    }
  };

  const aspect = 'relative w-full aspect-video bg-black rounded-lg overflow-hidden';

  // 1. Lazy play overlay
  if (!activated) {
    return (
      <div className={cn(aspect, className)}>
        <button
          onClick={() => setActivated(true)}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/80 to-accent/80 hover:from-primary/90 hover:to-accent/90 transition active:scale-[0.98]"
          style={poster ? { backgroundImage: `url(${poster})`, backgroundSize: 'cover' } : undefined}
        >
          <div className="bg-white/20 backdrop-blur-md rounded-full p-6">
            <Play className="h-12 w-12 text-white" />
          </div>
        </button>
      </div>
    );
  }

  // 2. Loading
  if (isLoading) {
    return (
      <div className={cn(aspect, 'flex items-center justify-center', className)}>
        <Loader2 className="h-8 w-8 text-white/70 animate-spin" />
      </div>
    );
  }

  // 3. Network / unknown error
  if (isError || !data) {
    return (
      <div className={cn(aspect, 'flex flex-col items-center justify-center gap-3 text-white/90', className)}>
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">Something went wrong loading this video.</p>
        <Button size="sm" variant="secondary" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  // 4. Logical denials / states
  if (!data.success) {
    const code = data.error_code;
    let title = 'This video is unavailable';
    let message = 'Please try again later.';
    let icon = <AlertCircle className="h-8 w-8" />;

    if (code === 'not_authorized') {
      title = 'Enrollment required';
      message = 'You need an active enrollment for this course to watch this video.';
      icon = <Lock className="h-8 w-8" />;
    } else if (code === 'not_authenticated') {
      title = 'Sign in required';
      message = 'Please sign in to watch this video.';
      icon = <Lock className="h-8 w-8" />;
    } else if (code === 'not_uploaded') {
      title = 'Video coming soon';
      message = 'This video is being re-encoded for our new private host. It will be available within the next few days — your access is already in place.';
      icon = <Upload className="h-8 w-8" />;
    } else if (code === 'not_found') {
      title = 'Video not found';
      message = 'This video is no longer available.';
    }

    return (
      <div className={cn(aspect, 'flex flex-col items-center justify-center gap-3 text-white/90 px-6 text-center', className)}>
        {icon}
        <p className="text-base font-semibold">{title}</p>
        <p className="text-sm text-white/70 max-w-sm">{message}</p>
      </div>
    );
  }

  // 5a. Vimeo path (used until asset is migrated to Supabase Storage)
  if (data.provider === 'vimeo' && data.vimeo_id) {
    return (
      <VimeoIframe
        vimeoId={data.vimeo_id}
        vimeoHash={data.vimeo_hash ?? null}
        fallbackUrl={data.fallback_url ?? null}
        poster={poster || data.thumbnail_url || undefined}
        className={cn(aspect, className)}
        completionThreshold={completionThreshold}
        onComplete={onComplete}
      />
    );
  }

  // 5b. Play (Supabase Storage signed URL)
  return (
    <div className={cn(aspect, className)}>
      <video
        ref={videoRef}
        src={data.url}
        poster={poster || data.thumbnail_url || undefined}
        className="absolute inset-0 w-full h-full"
        controls
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
};

interface VimeoIframeProps {
  vimeoId: string;
  vimeoHash: string | null;
  fallbackUrl: string | null;
  poster?: string;
  className?: string;
  completionThreshold: number;
  onComplete?: () => void;
}

const VimeoIframe: React.FC<VimeoIframeProps> = ({
  vimeoId,
  vimeoHash,
  fallbackUrl,
  poster,
  className,
  completionThreshold,
  onComplete,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const [useFallback, setUseFallback] = useState(false);

  // Wire up Vimeo Player events: completion tracking + error/load-timeout → fallback.
  useEffect(() => {
    if (useFallback || !iframeRef.current) return;
    const player = new Player(iframeRef.current);
    let loaded = false;

    const failover = (reason: string) => {
      if (loaded) return;
      if (!fallbackUrl) return;
      console.warn(`[SecureVideoPlayer] Vimeo unavailable (${reason}), switching to Storage fallback`);
      setUseFallback(true);
    };

    const onLoaded = () => {
      loaded = true;
    };
    const onError = (err: unknown) => {
      console.warn('[SecureVideoPlayer] Vimeo player error', err);
      failover('player_error');
    };
    const onTime = (d: { seconds: number; duration: number }) => {
      if (completedRef.current || !onComplete) return;
      if (d.duration > 0 && d.seconds / d.duration >= completionThreshold) {
        completedRef.current = true;
        onComplete();
      }
    };
    const onEnded = () => {
      if (!completedRef.current && onComplete) {
        completedRef.current = true;
        onComplete();
      }
    };

    player.on('loaded', onLoaded);
    player.on('error', onError);
    player.on('timeupdate', onTime);
    player.on('ended', onEnded);

    // If Vimeo never reports `loaded` within 8s, assume the embed was blocked
    // (e.g. "This video isn't available") and fall back to the MP4 if we have one.
    const timeoutId = window.setTimeout(() => failover('load_timeout'), 8000);

    return () => {
      window.clearTimeout(timeoutId);
      try {
        player.off('loaded', onLoaded);
        player.off('error', onError);
        player.off('timeupdate', onTime);
        player.off('ended', onEnded);
        player.destroy();
      } catch {
        // ignore
      }
    };
  }, [vimeoId, fallbackUrl, completionThreshold, onComplete, useFallback]);

  // Storage MP4 fallback playback + completion tracking.
  const handleTimeUpdate = () => {
    if (completedRef.current || !onComplete) return;
    const v = videoRef.current;
    if (!v || !v.duration) return;
    if (v.currentTime / v.duration >= completionThreshold) {
      completedRef.current = true;
      onComplete();
    }
  };

  if (useFallback && fallbackUrl) {
    return (
      <div className={className}>
        <video
          ref={videoRef}
          src={fallbackUrl}
          poster={poster}
          className="absolute inset-0 w-full h-full"
          controls
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
        />
      </div>
    );
  }

  const src = `https://player.vimeo.com/video/${vimeoId}?${vimeoHash ? `h=${vimeoHash}&` : ''}badge=0&autopause=0&player_id=0&app_id=58479`;

  return (
    <div className={className}>
      <iframe
        ref={iframeRef}
        src={src}
        className="absolute inset-0 w-full h-full"
        frameBorder={0}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title="Video player"
      />
    </div>
  );
};

