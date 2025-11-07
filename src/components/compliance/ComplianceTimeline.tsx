import React from 'react';
import { CheckCircle, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
  date: Date;
  title: string;
  description: string;
  type: 'completed' | 'upcoming' | 'current';
  icon?: React.ReactNode;
}

interface ComplianceTimelineProps {
  lastUpdated: string;
}

export function ComplianceTimeline({ lastUpdated }: ComplianceTimelineProps) {
  const lastUpdateDate = new Date(lastUpdated);
  const nextReviewDate = new Date(lastUpdateDate);
  nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);
  
  const initialApprovalDate = new Date(lastUpdateDate);
  initialApprovalDate.setMonth(initialApprovalDate.getMonth() - 8);
  
  const events: TimelineEvent[] = [
    {
      date: initialApprovalDate,
      title: 'Initial COMAR Approval',
      description: 'Module approved and aligned with Maryland regulations',
      type: 'completed',
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      date: lastUpdateDate,
      title: 'Latest Compliance Review',
      description: 'Regulatory alignment verified and content updated',
      type: 'current',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      date: nextReviewDate,
      title: 'Next Scheduled Review',
      description: 'Six-month compliance audit and content verification',
      type: 'upcoming',
      icon: <Clock className="h-4 w-4" />
    }
  ];

  const getEventStyles = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'completed':
        return {
          dotBg: 'bg-green-500',
          lineBg: 'bg-green-200',
          cardBg: 'bg-green-50 border-green-200',
          textColor: 'text-green-700',
          iconColor: 'text-green-600'
        };
      case 'current':
        return {
          dotBg: 'bg-primary',
          lineBg: 'bg-primary/30',
          cardBg: 'bg-primary/5 border-primary/30',
          textColor: 'text-primary',
          iconColor: 'text-primary'
        };
      case 'upcoming':
        return {
          dotBg: 'bg-muted-foreground/40',
          lineBg: 'bg-muted-foreground/20',
          cardBg: 'bg-muted/30 border-border',
          textColor: 'text-muted-foreground',
          iconColor: 'text-muted-foreground'
        };
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-1">
      {events.map((event, index) => {
        const styles = getEventStyles(event.type);
        const isLast = index === events.length - 1;

        return (
          <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Timeline line */}
            {!isLast && (
              <div className={`absolute left-[11px] top-8 w-[2px] h-full ${styles.lineBg}`} />
            )}

            {/* Timeline dot */}
            <div className="relative flex-shrink-0 mt-1">
              <div className={`w-6 h-6 rounded-full ${styles.dotBg} flex items-center justify-center shadow-sm`}>
                <div className={`${styles.iconColor}`}>
                  {event.icon}
                </div>
              </div>
            </div>

            {/* Event card */}
            <div className={`flex-1 border ${styles.cardBg} rounded-lg p-4 shadow-sm`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h5 className={`font-semibold text-sm ${styles.textColor}`}>
                  {event.title}
                </h5>
                {event.type === 'current' && (
                  <Badge variant="default" className="text-xs">
                    Current
                  </Badge>
                )}
                {event.type === 'upcoming' && (
                  <Badge variant="outline" className="text-xs">
                    Scheduled
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                {event.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(event.date)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
