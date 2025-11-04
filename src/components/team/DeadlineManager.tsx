import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';

interface DeadlineManagerProps {
  userId: string;
  currentDeadline?: string;
}

export const DeadlineManager: React.FC<DeadlineManagerProps> = ({ userId, currentDeadline }) => {
  const [date, setDate] = useState<Date | undefined>(
    currentDeadline ? new Date(currentDeadline) : undefined
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) {
      toast.error('Please select a date');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_enrollment_deadline' as any, {
        user_id_param: userId,
        deadline_date: date.toISOString()
      });

      if (error) throw error;
      toast.success('Deadline updated successfully');
    } catch (error) {
      console.error('Error updating deadline:', error);
      toast.error('Failed to update deadline');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        disabled={(date) => date < new Date()}
      />
      <Button onClick={handleSave} disabled={saving || !date} className="w-full">
        {saving ? 'Saving...' : 'Set Deadline'}
      </Button>
    </div>
  );
};
