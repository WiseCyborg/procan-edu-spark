import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Building2, Award, Users } from 'lucide-react';
import { TRACKS, getTrackById, type TrackId } from '@/constants/tracks';

interface TrackBadgeStripProps {
  courseId: string;
  organizationName?: string | null;
  totalModules: number;
  className?: string;
}

export const TrackBadgeStrip: React.FC<TrackBadgeStripProps> = ({
  courseId,
  organizationName,
  totalModules,
  className = '',
}) => {
  const track = getTrackById(courseId);
  
  if (!track) return null;
  
  const getTrackIcon = () => {
    switch (track.targetAudience) {
      case 'employees':
        return <Award className="h-4 w-4" />;
      case 'managers':
        return <Users className="h-4 w-4" />;
      case 'specialists':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTrackColor = () => {
    switch (track.targetAudience) {
      case 'employees':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'managers':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'specialists':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${getTrackColor()} ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {getTrackIcon()}
        <span className="text-sm font-medium">
          You are enrolled in <strong>{track.shortName}</strong> ({totalModules} modules)
        </span>
        {organizationName && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1 text-sm">
              <Building2 className="h-3.5 w-3.5" />
              {organizationName}
            </span>
          </>
        )}
      </div>
      {track.prerequisiteId && (
        <Badge variant="outline" className="ml-auto text-xs">
          Requires {TRACKS[Object.keys(TRACKS).find(k => TRACKS[k as keyof typeof TRACKS].id === track.prerequisiteId) as keyof typeof TRACKS]?.shortName || 'prerequisite'}
        </Badge>
      )}
    </div>
  );
};

export default TrackBadgeStrip;
