import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Download, Clock, HardDrive } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recording {
  id: string;
  room_name: string;
  started_at: string;
  recording_url: string;
  recording_duration_seconds: number;
  recording_size_mb: number;
  recording_status: string;
}

interface CallRecordingsListProps {
  conversationId: string;
}

export const CallRecordingsList = ({ conversationId }: CallRecordingsListProps) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const { data, error } = await supabase
          .from('video_calls')
          .select('*')
          .eq('conversation_id', conversationId)
          .not('recording_url', 'is', null)
          .eq('recording_status', 'ready')
          .order('started_at', { ascending: false });

        if (error) throw error;

        setRecordings(data || []);
      } catch (error) {
        console.error('Error fetching recordings:', error);
        toast.error('Failed to load recordings');
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchRecordings();
    }
  }, [conversationId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading recordings...</div>;
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-6">
        <Play className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recordings available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <Play className="h-4 w-4" />
        Call Recordings ({recordings.length})
      </h4>
      
      {recordings.map(rec => (
        <Card key={rec.id} className="p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{rec.room_name}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(rec.started_at), 'PPp')}
                </span>
                <span className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  {formatDuration(rec.recording_duration_seconds)}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  {rec.recording_size_mb.toFixed(1)} MB
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <a href={rec.recording_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1">
                  <Play className="h-3 w-3" />
                  Watch
                </Button>
              </a>
              <a href={rec.recording_url} download>
                <Button size="sm" variant="ghost" className="gap-1">
                  <Download className="h-3 w-3" />
                </Button>
              </a>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
