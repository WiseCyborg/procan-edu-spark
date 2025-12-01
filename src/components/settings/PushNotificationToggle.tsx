import { Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationToggle = () => {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
        <BellOff className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            Push notifications not supported
          </p>
          <p className="text-xs text-muted-foreground">
            Your browser doesn't support push notifications
          </p>
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
      <Bell className={`h-5 w-5 ${isSubscribed ? 'text-primary' : 'text-muted-foreground'}`} />
      <div className="flex-1">
        <Label htmlFor="push-notifications" className="text-sm font-medium cursor-pointer">
          Push Notifications
        </Label>
        <p className="text-xs text-muted-foreground">
          {permission === 'denied' 
            ? 'Notification permission denied in browser settings'
            : isSubscribed 
              ? 'Receive notifications for messages and updates'
              : 'Enable notifications for real-time updates'
          }
        </p>
      </div>
      <Switch
        id="push-notifications"
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={loading || permission === 'denied'}
      />
    </div>
  );
};
