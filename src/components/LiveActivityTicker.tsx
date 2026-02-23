import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy } from 'lucide-react';

interface Activity {
  type: 'certificate' | 'module' | 'enrollment';
  message: string;
  timestamp: string;
  icon: typeof Trophy;
}

export const LiveActivityTicker = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: activities } = useQuery({
    queryKey: ['live-activities'],
    queryFn: async () => {
      try {
        const { data: exams, error: examsError } = await supabase
          .from('exam_attempts')
          .select('user_id, created_at, is_passed')
          .eq('is_passed', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (examsError) throw examsError;
        if (!exams || exams.length === 0) return [];

        const recentActivities: Activity[] = exams.map((exam: any) => ({
          type: 'certificate' as const,
          message: `Someone from Maryland just earned their certificate! 🎉`,
          timestamp: exam.created_at,
          icon: Trophy,
        }));

        return recentActivities;
      } catch (error) {
        console.warn('LiveActivityTicker: failed to load activities', error);
        return [];
      }
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!activities || activities.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [activities]);

  if (!activities || activities.length === 0) {
    return null;
  }

  const currentActivity = activities[currentIndex];
  const ActivityIcon = currentActivity.icon;

  return (
    <div className="bg-primary/5 border-y border-primary/10 py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-3 text-foreground">
          <ActivityIcon className="h-5 w-5 text-primary animate-bounce" />
          <p className="text-sm md:text-base font-medium animate-fade-in">
            {currentActivity.message}
          </p>
        </div>
      </div>
    </div>
  );
};
