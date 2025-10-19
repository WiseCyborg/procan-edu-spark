import React from 'react';
import { Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WelcomeVideoSectionProps {
  videoUrl: string;
  className?: string;
}

export const WelcomeVideoSection: React.FC<WelcomeVideoSectionProps> = ({ 
  videoUrl, 
  className = '' 
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

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
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Video Context */}
      <div className="text-center mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Welcome to Your Journey 👋
        </h2>
        <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
          We've partnered with the Maryland Cannabis Administration to deliver top-tier education for dispensary employees, 
          ensuring Maryland leads as the <strong>Cannabis Education State</strong>.
        </p>
      </div>

      {/* Vimeo Video Embed */}
      <Card className="overflow-hidden shadow-2xl border-2 border-white/20 bg-black/30 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative aspect-video">
            {!isPlaying ? (
              <div 
                className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center cursor-pointer group"
                onClick={() => setIsPlaying(true)}
              >
                <div className="text-center">
                  <div className="bg-white/20 backdrop-blur-md rounded-full p-8 group-hover:bg-white/30 transition-all group-hover:scale-110">
                    <Play className="h-16 w-16 text-white" />
                  </div>
                  <p className="text-white text-lg font-semibold mt-4">
                    Watch Welcome Message
                  </p>
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

      {/* Message from instructors */}
      <div className="mt-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center">
        <p className="text-white/95 text-lg leading-relaxed">
          In this video, you'll meet your instructors and learn what makes this program special. 
          <br />
          <strong className="text-white">We're here to support you every step of the way.</strong> ✨
        </p>
      </div>
    </div>
  );
};
