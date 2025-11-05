import React from 'react';
import { Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface WelcomeVideoSectionProps {
  videoUrl: string;
  className?: string;
}

export const WelcomeVideoSection: React.FC<WelcomeVideoSectionProps> = ({ 
  videoUrl, 
  className = '' 
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const isMobile = useIsMobile();

  // Extract Vimeo video ID from URL
  const getVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  const videoId = getVimeoId(videoUrl);
  const hashMatch = videoUrl.match(/\/([a-zA-Z0-9]+)$/);
  const videoHash = hashMatch ? hashMatch[1] : '';

  const embedUrl = `https://player.vimeo.com/video/${videoId}${videoHash ? `?h=${videoHash}` : ''}`;

  return (
    <div className={`mx-auto ${isMobile ? 'max-w-md' : 'max-w-4xl'} ${className}`}>
      {/* Video Context - Compact on Mobile */}
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

      {/* Vimeo Video Embed - Optimized for Mobile */}
      <Card className={`overflow-hidden shadow-2xl border-white/20 bg-black/30 backdrop-blur-sm ${isMobile ? 'border rounded-lg' : 'border-2'}`}>
        <CardContent className="p-0">
          <div className="relative aspect-video">
            {!isPlaying ? (
              <div 
                className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                onClick={() => setIsPlaying(true)}
              >
                <div className="text-center">
                  {/* Tap-Friendly Play Button */}
                  <div className={`bg-white/20 backdrop-blur-md rounded-full transition-all active:bg-white/40 ${
                    isMobile 
                      ? 'p-6 min-w-[80px] min-h-[80px] flex items-center justify-center' 
                      : 'p-8 group-hover:bg-white/30 group-hover:scale-110'
                  }`}>
                    <Play className={`text-white ${isMobile ? 'h-10 w-10' : 'h-16 w-16'}`} />
                  </div>
                  {!isMobile && (
                    <p className="text-white text-lg font-semibold mt-4">
                      Watch Welcome Message
                    </p>
                  )}
                  {isMobile && (
                    <p className="text-white text-sm font-semibold mt-2">
                      Tap to play • 2 min
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <iframe
                src={`${embedUrl}&autoplay=1&title=0&byline=0&portrait=0`}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="ProCann Training Welcome Video"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message from instructors - Hidden on Mobile to Save Space */}
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
