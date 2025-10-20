import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity } from 'lucide-react';
import { useUserPresence } from '@/hooks/useUserPresence';

export const WhoIsHereWidget = () => {
  const { onlineUsers, totalOnline } = useUserPresence();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500 animate-pulse" />
          Who's Here Now
        </CardTitle>
        <CardDescription>
          {totalOnline} {totalOnline === 1 ? 'user' : 'users'} online
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {onlineUsers.map((user) => (
            <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
              <Avatar>
                <AvatarFallback>
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.page || '/'}
                </p>
              </div>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          ))}
          {onlineUsers.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">
              No other users online
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
