import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { SecureVideoPlayer } from '@/components/video/SecureVideoPlayer';
import welcomePoster from '@/assets/welcome-video-poster.jpg';

interface WelcomeVideoSectionProps {
  /**
   * Direct Vimeo URL to render. When provided, the player loads this URL via
   * an iframe and the `assetKey` path is skipped. Supports the formats:
   *  - https://vimeo.com/<id>
   *  - https://vimeo.com/<id>?h=<hash>
   *  - https://vimeo.com/<id>/<hash>
   *  - https://player.vimeo.com/video/<id>?h=<hash>
   */
  videoUrl?: string;
  className?: string;
  /** Asset key fallback when `videoUrl` isn't provided. */
  assetKey?: string;
}

/** Convert any of the supported vimeo URL forms into a player.vimeo.com embed URL. */
function toVimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/vimeo\.com$/.test(u.hostname) && u.hostname !== 'player.vimeo.com') return null;

    // Already an embed URL — return as-is with our params merged.
    if (u.hostname === 'player.vimeo.com') {
      u.searchParams.set('badge', '0');
      u.searchParams.set('autopause', '0');
      u.searchParams.set('player_id', '0');
      u.searchParams.set('app_id', '58479');
      return u.toString();
    }

    // vimeo.com/<id>[/<hash>]
    const parts = u.pathname.split('/').filter(Boolean);
    const id = parts[0];
    if (!id || !/^\d+$/.test(id)) return null;
    const hash = parts[1] ?? u.searchParams.get('h') ?? '';
    const qs = new URLSearchParams();
    if (hash) qs.set('h', hash);
    qs.set('badge', '0');
    qs.set('autopause', '0');
    qs.set('player_id', '0');
    qs.set('app_id', '58479');
    return `https://player.vimeo.com/video/${id}?${qs.toString()}`;
  } catch {
    return null;
  }
}

export const WelcomeVideoSection: React.FC<WelcomeVideoSectionProps> = ({
  videoUrl,
  className = '',
  assetKey = 'welcome-intro',
}) => {
  const isMobile = useIsMobile();
  const embedUrl = videoUrl ? toVimeoEmbedUrl(videoUrl) : null;

  return (
    <div className={`mx-auto ${isMobile ? 'max-w-md' : 'max-w-4xl'} ${className}`}>
      <div className={`text-center ${isMobile ? 'mb-3' : 'mb-6'}`}>
        <h2 className={`font-bold text-white ${isMobile ? 'text-xl mb-2' : 'text-3xl md:text-4xl mb-4'}`}>
          {isMobile ? 'Welcome 👋' : 'Welcome to Your Journey 👋'}
        </h2>
        {!isMobile && (
          <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
            Our curriculum is aligned to Maryland Cannabis Administration Responsible Vendor Training standards, helping Maryland lead as the <strong>Cannabis Education State</strong>.
          </p>
        )}
      </div>

      <Card className={`overflow-hidden shadow-2xl border-white/20 bg-black/30 backdrop-blur-sm ${isMobile ? 'border rounded-lg' : 'border-2'}`}>
        <CardContent className="p-0">
          {embedUrl ? (
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                frameBorder={0}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Welcome video"
              />
            </div>
          ) : (
            <SecureVideoPlayer assetKey={assetKey} poster={welcomePoster} />
          )}
        </CardContent>
      </Card>

      {!isMobile && (
        <div className="mt-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
          <p className="text-white/95 text-lg leading-relaxed">
            In this video, you'll meet your instructors and learn what makes this program special.
            <br />
            <strong className="text-white">We're here to support you every step of the way.</strong> ✨
          </p>
        </div>
      )}
    </div>
  );
};
