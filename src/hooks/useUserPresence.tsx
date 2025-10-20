import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface OnlineUser {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  online_at: string;
  page: string;
}

export const useUserPresence = () => {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users-presence');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users: OnlineUser[] = [];
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id) {
              users.push(presence as OnlineUser);
            }
          });
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', user.id)
            .single();

          await channel.track({
            user_id: user.id,
            email: user.email,
            first_name: profile?.first_name || 'Unknown',
            last_name: profile?.last_name || 'User',
            online_at: new Date().toISOString(),
            page: window.location.pathname
          });
        }
      });

    channelRef.current = channel;

    const handleLocationChange = () => {
      if (channel && user) {
        channel.track({
          user_id: user.id,
          email: user.email,
          online_at: new Date().toISOString(),
          page: window.location.pathname
        });
      }
    };

    window.addEventListener('popstate', handleLocationChange);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [user]);

  return { onlineUsers, totalOnline: onlineUsers.length };
};
