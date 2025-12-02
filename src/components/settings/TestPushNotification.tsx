import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { pushNotificationService } from '@/services/pushNotificationService';
import { toast } from 'sonner';

export const TestPushNotification = () => {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);

  const handleTestNotification = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to test notifications');
      return;
    }

    setIsSending(true);
    try {
      const result = await pushNotificationService.sendTestNotification(user.id);
      
      if (result.success) {
        toast.success('Test notification sent! Check your notifications.');
      } else {
        toast.error('Failed to send test notification. Make sure you have enabled push notifications.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
      <Bell className="h-5 w-5 text-primary" />
      <div className="flex-1">
        <p className="text-sm font-medium">Test Your Notifications</p>
        <p className="text-xs text-muted-foreground">
          Send yourself a test notification to verify your setup is working
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleTestNotification}
        disabled={isSending}
      >
        {isSending ? 'Sending...' : 'Send Test'}
      </Button>
    </div>
  );
};
