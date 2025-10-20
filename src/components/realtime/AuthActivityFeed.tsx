import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, LogIn, Mail, Key } from 'lucide-react';
import { useAuthActivity } from '@/hooks/useAuthActivity';
import { formatDistanceToNow } from 'date-fns';

export const AuthActivityFeed = () => {
  const { recentActivity, loading } = useAuthActivity();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'signup': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'signin': return <LogIn className="h-4 w-4 text-blue-500" />;
      case 'verification_sent': return <Mail className="h-4 w-4 text-purple-500" />;
      case 'password_reset': return <Key className="h-4 w-4 text-orange-500" />;
      default: return <LogIn className="h-4 w-4" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'signup': return 'Signed Up';
      case 'signin': return 'Signed In';
      case 'verification_sent': return 'Verification Sent';
      case 'password_reset': return 'Password Reset';
      default: return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Activity</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Activity</CardTitle>
        <CardDescription>Real-time user signups and logins</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentActivity.slice(0, 20).map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-accent transition-colors">
              {getActivityIcon(activity.activity_type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{activity.email}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {getActivityLabel(activity.activity_type)}
              </Badge>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">
              No authentication activity yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
