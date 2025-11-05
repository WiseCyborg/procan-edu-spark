import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRegulatoryNotifications, useAcknowledgeNotification } from '@/hooks/useRegulatoryContent';
import { Link } from 'react-router-dom';

export const RegulationChangeAlert = () => {
  const { data: notifications, isLoading } = useRegulatoryNotifications();
  const acknowledgeMutation = useAcknowledgeNotification();

  if (isLoading || !notifications || notifications.length === 0) {
    return null;
  }

  const criticalNotifications = notifications.filter(n => n.requires_recertification);
  const standardNotifications = notifications.filter(n => !n.requires_recertification);

  return (
    <div className="space-y-3">
      {criticalNotifications.map((notification) => (
        <Alert key={notification.id} variant="destructive" className="relative">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="pr-8">Critical Regulation Update</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              <strong>COMAR {notification.comar_section}</strong> has been updated.
            </p>
            <p className="text-sm mb-3">{notification.change_summary}</p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="destructive">
                <Link to="/course">Review Changes & Re-Certify</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => acknowledgeMutation.mutate(notification.id)}
                disabled={acknowledgeMutation.isPending}
              >
                Acknowledge
              </Button>
            </div>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={() => acknowledgeMutation.mutate(notification.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}

      {standardNotifications.map((notification) => (
        <Alert key={notification.id} className="relative">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="pr-8">Regulation Update</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">
              <strong>COMAR {notification.comar_section}</strong> has been updated.
            </p>
            <p className="text-sm mb-3">{notification.change_summary}</p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link to="/regulatory-explorer">View Changes</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => acknowledgeMutation.mutate(notification.id)}
                disabled={acknowledgeMutation.isPending}
              >
                Acknowledge
              </Button>
            </div>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={() => acknowledgeMutation.mutate(notification.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
};
