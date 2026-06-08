import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { SecureVideoPlayer } from '@/components/video/SecureVideoPlayer';

interface WelcomeVideoSectionProps {
  /** Legacy prop, retained for backwards compatibility — ignored. */
  videoUrl?: string;
  className?: string;
  /** Override the default welcome video asset key */
  assetKey?: string;
}

export const WelcomeVideoSection: React.FC<WelcomeVideoSectionProps> = ({
  className = '',
  assetKey = 'welcome-intro',
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={`mx-auto ${isMobile ? 'max-w-md' : 'max-w-4xl'} ${className}`}>
      <div className={`text-center ${isMobile ? 'mb-3' : 'mb-6'}`}>
        <h2 className={`font-bold text-white ${isMobile ? 'text-xl mb-2' : 'text-3xl md:text-4xl mb-4'}`}>
          {isMobile ? 'Welcome 👋' : 'Welcome to Your Journey 👋'}
        </h2>
        {!isMobile && (
          <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
            We've partnered with the Maryland Cannabis Administration to deliver top-tier education for dispensary employees,
            ensuring Maryland leads as the <strong>Cannabis Education State</strong>.
          </p>
        )}
      </div>

      <Card className={`overflow-hidden shadow-2xl border-white/20 bg-black/30 backdrop-blur-sm ${isMobile ? 'border rounded-lg' : 'border-2'}`}>
        <CardContent className="p-0">
          <SecureVideoPlayer assetKey={assetKey} />
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
