import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Globe, 
  Smartphone, 
  Monitor,
  MapPin,
  Clock
} from 'lucide-react';
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserSession {
  id: string;
  firstName: string;
  lastName: string;
  location?: string;
  device?: string;
  lastActivity: Date;
  status: 'active' | 'idle' | 'away';
}

export const RealTimeUserActivity = () => {
  const { metrics } = useRealTimeAnalytics();
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserSessions = async () => {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, updated_at')
          .order('updated_at', { ascending: false })
          .limit(10);

        if (profiles) {
          const sessions: UserSession[] = profiles.map(profile => {
            const lastActivity = new Date(profile.updated_at);
            const minutesSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60);
            
            return {
              id: profile.user_id,
              firstName: profile.first_name || 'Unknown',
              lastName: profile.last_name || 'User',
              location: 'Maryland, US', // Mock data
              device: Math.random() > 0.5 ? 'Desktop' : 'Mobile',
              lastActivity,
              status: minutesSinceActivity < 5 ? 'active' : minutesSinceActivity < 15 ? 'idle' : 'away'
            };
          });
          
          setUserSessions(sessions);
        }
      } catch (error) {
        console.error('Error fetching user sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserSessions();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUserSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDeviceIcon = (device: string) => {
    return device === 'Mobile' ? 
      <Smartphone className="h-3 w-3" /> : 
      <Monitor className="h-3 w-3" />;
  };

  const formatLastActivity = (lastActivity: Date) => {
    const minutes = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Active Users Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">Live User Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Users</span>
            <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
              {metrics.activeUsers} online
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Sessions (24h)</span>
            <span className="text-sm font-medium">{metrics.totalSessions}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Peak Concurrent</span>
            <span className="text-sm font-medium">{Math.floor(metrics.activeUsers * 1.3)}</span>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>Most active region: Maryland, US</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Peak hours: 9 AM - 5 PM EST</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent User Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[280px] px-4">
            {loading ? (
              <div className="space-y-3 pb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="h-8 w-8 bg-muted rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {userSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {session.firstName.charAt(0)}{session.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(session.status)}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {session.firstName} {session.lastName}
                        </span>
                        <Badge variant="outline" className="h-4 text-xs">
                          {session.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {getDeviceIcon(session.device)}
                          <span>{session.device}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{session.location}</span>
                        </div>
                        <span>{formatLastActivity(session.lastActivity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};