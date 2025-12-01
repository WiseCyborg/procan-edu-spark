import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Users, X, Check, Download } from 'lucide-react';
import { format, formatDistanceToNow, isBefore, addMinutes } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface ScheduledCall {
  id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  host_id: string;
  status: 'scheduled' | 'started' | 'ended' | 'cancelled';
  host?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  invites?: Array<{
    user_id: string;
    status: 'pending' | 'accepted' | 'declined';
  }>;
}

interface UpcomingCallsListProps {
  calls: ScheduledCall[];
  onCancel: (callId: string) => void;
  onRespond: (callId: string, status: 'accepted' | 'declined') => void;
}

export const UpcomingCallsList = ({
  calls,
  onCancel,
  onRespond
}: UpcomingCallsListProps) => {
  const { user } = useAuth();

  const getStatusBadge = (call: ScheduledCall) => {
    const now = new Date();
    const scheduledTime = new Date(call.scheduled_at);
    const endTime = addMinutes(scheduledTime, call.duration_minutes);

    if (call.status === 'cancelled') {
      return <Badge variant="secondary">Cancelled</Badge>;
    }

    if (isBefore(endTime, now)) {
      return <Badge variant="outline">Ended</Badge>;
    }

    const minutesUntil = (scheduledTime.getTime() - now.getTime()) / 1000 / 60;

    if (minutesUntil < 0) {
      return <Badge className="bg-destructive">In Progress</Badge>;
    }

    if (minutesUntil <= 5) {
      return <Badge className="bg-yellow-500">Starting Soon</Badge>;
    }

    return <Badge variant="outline">Scheduled</Badge>;
  };

  const getUserInviteStatus = (call: ScheduledCall) => {
    return call.invites?.find(invite => invite.user_id === user?.id);
  };

  const generateICS = (call: ScheduledCall) => {
    const start = new Date(call.scheduled_at);
    const end = addMinutes(start, call.duration_minutes);

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${call.title}`,
      `DESCRIPTION:${call.description || 'Video call via ProCann Edu'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${call.title.replace(/\s+/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (calls.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No upcoming calls scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calls.map(call => {
        const isHost = call.host_id === user?.id;
        const inviteStatus = getUserInviteStatus(call);

        return (
          <Card key={call.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold truncate">{call.title}</h4>
                  {getStatusBadge(call)}
                  {isHost && <Badge variant="secondary">Host</Badge>}
                </div>

                {call.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {call.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(call.scheduled_at), 'PPP')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(call.scheduled_at), 'p')} ({call.duration_minutes} min)
                  </div>
                  {call.invites && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {call.invites.filter(i => i.status === 'accepted').length} accepted
                    </div>
                  )}
                </div>

                {call.host && (
                  <div className="flex items-center gap-2 mt-3">
                    <Avatar className="h-5 w-5">
                      {call.host.profile_photo_url && (
                        <AvatarImage src={call.host.profile_photo_url} />
                      )}
                      <AvatarFallback className="text-[10px]">
                        {call.host.first_name[0]}{call.host.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      Hosted by {call.host.first_name} {call.host.last_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateICS(call)}
                  title="Add to calendar"
                >
                  <Download className="h-3 w-3" />
                </Button>

                {isHost && call.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(call.id)}
                    title="Cancel call"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}

                {!isHost && inviteStatus?.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onRespond(call.id, 'accepted')}
                      title="Accept"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRespond(call.id, 'declined')}
                      title="Decline"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {!isHost && inviteStatus && inviteStatus.status !== 'pending' && (
              <div className="mt-3 pt-3 border-t text-xs">
                {inviteStatus.status === 'accepted' ? (
                  <span className="text-green-600">✓ You accepted this invitation</span>
                ) : (
                  <span className="text-muted-foreground">You declined this invitation</span>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
