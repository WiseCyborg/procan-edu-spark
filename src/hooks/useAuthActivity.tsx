import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthActivity {
  id: string;
  user_id: string;
  activity_type: 'signup' | 'signin' | 'signout' | 'password_reset' | 'verification_sent' | 'email_opened' | 'email_clicked';
  email: string;
  metadata: any;
  created_at: string;
}

export const useAuthActivity = () => {
  const [recentActivity, setRecentActivity] = useState<AuthActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecentActivity = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecentActivity((data || []) as AuthActivity[]);
    } catch (error) {
      console.error('Error fetching auth activity:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentActivity();

    const channel = supabase
      .channel('auth-activity-tracking')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_activity_log' },
        (payload) => {
          const newActivity = payload.new as AuthActivity;
          
          setRecentActivity(prev => [newActivity, ...prev.slice(0, 49)]);
          
          if (newActivity.activity_type === 'signup') {
            toast({
              title: "🎉 New User Signup!",
              description: `${newActivity.email} just registered`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecentActivity, toast]);

  return { recentActivity, loading, refreshActivity: fetchRecentActivity };
};
