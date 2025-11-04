import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Award, BookOpen, Sparkles } from 'lucide-react';

interface Activity {
  type: 'certificate' | 'module' | 'enrollment';
  message: string;
  timestamp: string;
  icon: typeof Trophy;
}

// Mock activities for demonstration
const mockActivities: Activity[] = [
  {
    type: 'certificate',
    message: 'Sarah from Baltimore County just earned their RVT certificate! 🎉',
    timestamp: new Date().toISOString(),
    icon: Trophy
  },
  {
    type: 'module',
    message: 'Michael from Montgomery County completed Module 12 with 95%!',
    timestamp: new Date().toISOString(),
    icon: BookOpen
  },
  {
    type: 'enrollment',
    message: 'Green Leaf Wellness enrolled 8 new team members today!',
    timestamp: new Date().toISOString(),
    icon: Sparkles
  },
  {
    type: 'certificate',
    message: 'Jennifer from Anne Arundel just passed their final exam on first try!',
    timestamp: new Date().toISOString(),
    icon: Award
  },
  {
    type: 'certificate',
    message: 'David from Prince George\'s County earned perfect score on exam!',
    timestamp: new Date().toISOString(),
    icon: Trophy
  },
];

export const LiveActivityTicker = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: activities } = useQuery({
    queryKey: ['live-activities'],
    queryFn: async () => {
      try {
        // Try to fetch recent exam passes
        const { data: exams, error } = await supabase
          .from('exam_attempts')
          .select(`
            created_at,
            is_passed,
            profiles:user_id (
              first_name,
              county
            )
          `)
          .eq('is_passed', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (exams && exams.length > 0) {
          const recentActivities: Activity[] = exams.map((exam: any) => ({
            type: 'certificate' as const,
            message: `${exam.profiles?.first_name || 'Someone'} from ${exam.profiles?.county || 'Maryland'} just earned their certificate! 🎉`,
            timestamp: exam.created_at,
            icon: Trophy
          }));
          return recentActivities;
        }
      } catch (error) {
        console.log('Using mock activity data');
      }
      
      return mockActivities;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
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
