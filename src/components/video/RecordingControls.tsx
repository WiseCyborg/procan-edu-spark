import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Circle, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecordingControlsProps {
  callId: string;
  isHost: boolean;
  isRecording: boolean;
  onRecordingChange: () => void;
}

export const RecordingControls = ({
  callId,
  isHost,
  isRecording,
  onRecordingChange
}: RecordingControlsProps) => {
  const [loading, setLoading] = useState(false);

  if (!isHost) return null;

  const toggleRecording = async () => {
    setLoading(true);
    try {
      const endpoint = isRecording ? 'stop-call-recording' : 'start-call-recording';
      
      const { error } = await supabase.functions.invoke(endpoint, {
        body: { callId }
      });

      if (error) throw error;

      toast.success(isRecording ? 'Recording stopped' : 'Recording started');
      onRecordingChange();
    } catch (error) {
      console.error('Error toggling recording:', error);
      toast.error(isRecording ? 'Failed to stop recording' : 'Failed to start recording');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isRecording ? "destructive" : "outline"}
      size="sm"
      onClick={toggleRecording}
      disabled={loading}
      className="gap-2"
    >
      {isRecording ? (
        <>
          <Square className="h-4 w-4" />
          Stop Recording
        </>
      ) : (
        <>
          <Circle className="h-4 w-4 text-destructive fill-destructive" />
          Start Recording
        </>
      )}
    </Button>
  );
};
