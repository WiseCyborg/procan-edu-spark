import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Building2,
  Users,
  GraduationCap,
  Award,
  Mail,
  Wrench,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { 
  HealthFeedItem, 
  PipelineType, 
  IssueSeverity, 
  AgentType 
} from '@/types/pipelineAgents';
import { usePipelineHealthEvents, PipelineHealthEvent } from '@/hooks/usePipelineHealthAgent';

// ============= ICON MAPPINGS =============
const pipelineIcons: Record<PipelineType, React.ReactNode> = {
  application: <Building2 className="h-4 w-4" />,
  organization: <Building2 className="h-4 w-4" />,
  seat: <Users className="h-4 w-4" />,
  training: <GraduationCap className="h-4 w-4" />,
  certification: <Award className="h-4 w-4" />,
  communications: <Mail className="h-4 w-4" />,
};

const severityColors: Record<IssueSeverity, string> = {
  critical: 'text-destructive bg-destructive/10 border-destructive/20',
  warning: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
  info: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
};

const severityIcons: Record<IssueSeverity, React.ReactNode> = {
  critical: <XCircle className="h-4 w-4 text-destructive" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

// ============= FEED ITEM COMPONENT =============
interface FeedItemProps {
  event: PipelineHealthEvent;
  onAcknowledge?: (id: string) => void;
}

const FeedItem: React.FC<FeedItemProps> = ({ event, onAcknowledge }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`p-3 rounded-lg border transition-all ${
        event.auto_fixed 
          ? 'bg-green-500/5 border-green-500/20' 
          : severityColors[event.severity as IssueSeverity] || severityColors.info
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {event.auto_fixed ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            severityIcons[event.severity as IssueSeverity] || severityIcons.info
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {pipelineIcons[event.pipeline as PipelineType]}
            <span className="text-xs font-medium uppercase text-muted-foreground">
              {event.pipeline}
            </span>
            <Badge 
              variant={event.severity === 'critical' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {event.severity}
            </Badge>
            {event.auto_fixed && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-500">
                <Wrench className="h-3 w-3 mr-1" />
                Auto-Fixed
              </Badge>
            )}
            {event.requires_admin && !event.auto_fixed && (
              <Badge variant="destructive" className="text-xs">
                Admin Required
              </Badge>
            )}
          </div>
          
          <p className="text-sm font-medium mt-1">{event.description}</p>
          
          {event.fix_action && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {event.fix_action}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </Button>
      </div>
      
      {/* Expanded Details */}
      {expanded && event.metadata && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Details</p>
          <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
          
          {!event.auto_fixed && event.requires_admin && onAcknowledge && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => onAcknowledge(event.id)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Acknowledge
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// ============= HEALTH FEED COMPONENT =============
interface HealthFeedProps {
  maxItems?: number;
  showFilters?: boolean;
  compact?: boolean;
}

export const HealthFeed: React.FC<HealthFeedProps> = ({ 
  maxItems = 20, 
  showFilters = true,
  compact = false 
}) => {
  const { data: events, isLoading } = usePipelineHealthEvents(maxItems);
  const [filter, setFilter] = useState<'all' | 'critical' | 'auto_fixed' | 'admin'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(true);

  const filteredEvents = React.useMemo(() => {
    if (!events) return [];
    
    return events.filter(event => {
      switch (filter) {
        case 'critical':
          return event.severity === 'critical';
        case 'auto_fixed':
          return event.auto_fixed;
        case 'admin':
          return event.requires_admin && !event.auto_fixed;
        default:
          return true;
      }
    });
  }, [events, filter]);

  const criticalCount = events?.filter(e => e.severity === 'critical').length || 0;
  const autoFixedCount = events?.filter(e => e.auto_fixed).length || 0;
  const adminCount = events?.filter(e => e.requires_admin && !e.auto_fixed).length || 0;

  if (compact) {
    return (
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm">All systems healthy</p>
          </div>
        ) : (
          filteredEvents.slice(0, 5).map(event => (
            <FeedItem key={event.id} event={event} />
          ))
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Health Feed</CardTitle>
          </div>
          
          {showFilters && (
            <div className="flex items-center gap-1">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'critical' ? 'destructive' : 'ghost'}
                size="sm"
                onClick={() => setFilter('critical')}
              >
                Critical {criticalCount > 0 && `(${criticalCount})`}
              </Button>
              <Button
                variant={filter === 'auto_fixed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('auto_fixed')}
                className={filter === 'auto_fixed' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                <Wrench className="h-3 w-3 mr-1" />
                Fixed {autoFixedCount > 0 && `(${autoFixedCount})`}
              </Button>
              <Button
                variant={filter === 'admin' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('admin')}
              >
                Admin {adminCount > 0 && `(${adminCount})`}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 animate-pulse mx-auto mb-2" />
              <p>Loading health feed...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="font-medium">All systems healthy</p>
              <p className="text-xs mt-1">No issues detected in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map(event => (
                <FeedItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HealthFeed;
