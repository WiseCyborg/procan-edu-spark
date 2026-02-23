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
        // 1) Fetch recent passed exam attempts (no relationship join)
        const { data: exams, error: examsError } = await supabase
          .from('exam_attempts')
          .select('user_id, created_at, is_passed')
          .eq('is_passed', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (examsError) throw examsError;
        if (!exams || exams.length === 0) return [];

        // 2) Fetch profiles separately for matched user_ids
        const userIds = [...new Set(exams.map((e: any) => e.user_id).filter(Boolean))];
        const profileMap = new Map<string, { first_name: string | null; county: string | null }>();

        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, county')
            .in('user_id', userIds);

          if (!profilesError && profiles) {
            profiles.forEach((p: any) => {
              profileMap.set(p.user_id, { first_name: p.first_name, county: p.county });
            });
          }
        }

        // 3) Merge into activity items
        const recentActivities: Activity[] = exams.map((exam: any) => {
          const profile = profileMap.get(exam.user_id);
          return {
            type: 'certificate' as const,
            message: `${profile?.first_name || 'Someone'} from ${profile?.county || 'Maryland'} just earned their certificate! 🎉`,
            timestamp: exam.created_at,
            icon: Trophy,
          };
        });

        return recentActivities;
      } catch (error) {
        console.log('No recent activity data available');
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
