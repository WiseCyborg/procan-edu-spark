import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, AlertTriangle, Clock, Send, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationRule {
  id: string;
  type: 'certificate_expiry' | 'payment_due' | 'course_incomplete' | 'org_compliance';
  enabled: boolean;
  trigger_days: number;
  message_template: string;
  escalation_enabled: boolean;
}

interface PendingNotification {
  id: string;
  type: string;
  recipient: string;
  message: string;
  scheduled_for: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'sent' | 'failed';
}

export const SmartNotificationSystem = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultRules: NotificationRule[] = [
    {
      id: '1',
      type: 'certificate_expiry',
      enabled: true,
      trigger_days: 30,
      message_template: 'Your certificate expires in {days} days. Please renew to maintain compliance.',
      escalation_enabled: true
    },
    {
      id: '2',
      type: 'payment_due',
      enabled: true,
      trigger_days: 7,
      message_template: 'Payment is due in {days} days for your training program.',
      escalation_enabled: false
    },
    {
      id: '3',
      type: 'course_incomplete',
      enabled: true,
      trigger_days: 14,
      message_template: 'You have incomplete training modules. Complete them to maintain compliance.',
      escalation_enabled: true
    },
    {
      id: '4',
      type: 'org_compliance',
      enabled: true,
      trigger_days: 5,
      message_template: 'Your organization has employees with pending compliance requirements.',
      escalation_enabled: true
    }
  ];

  useEffect(() => {
    fetchNotificationData();
  }, []);

  const fetchNotificationData = async () => {
    try {
      setRules(defaultRules);
      
      // Simulate pending notifications
      const mockNotifications: PendingNotification[] = [
        {
          id: '1',
          type: 'certificate_expiry',
          recipient: 'john.doe@example.com',
          message: 'Your certificate expires in 30 days.',
          scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          status: 'pending'
        },
        {
          id: '2',
          type: 'course_incomplete',
          recipient: 'jane.smith@example.com',
          message: 'Please complete your training modules.',
          scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          status: 'pending'
        }
      ];
      
      setPendingNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notification data:', error);
      toast({
        title: "Error",
        description: "Failed to load notification settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRule = (ruleId: string, updates: Partial<NotificationRule>) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
    
    toast({
      title: "Rule Updated",
      description: "Notification rule has been updated successfully."
    });
  };

  const sendNotificationNow = async (notificationId: string) => {
    try {
      // Here you would call the edge function to send the notification
      setPendingNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { ...notif, status: 'sent' } : notif
      ));
      
      toast({
        title: "Notification Sent",
        description: "The notification has been sent successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive"
      });
    }
  };

  const triggerBulkNotifications = async () => {
    try {
      // Simulate checking for upcoming expirations and sending bulk notifications
      const newNotifications = await Promise.all([
        // This would be replaced with actual database queries
        new Promise(resolve => setTimeout(() => resolve({
          id: Date.now().toString(),
          type: 'certificate_expiry',
          recipient: 'bulk@example.com',
          message: 'Bulk reminder sent',
          scheduled_for: new Date().toISOString(),
          priority: 'medium' as const,
          status: 'sent' as const
        }), 500))
      ]);
      
      toast({
        title: "Bulk Notifications Sent",
        description: `${newNotifications.length} notifications have been queued for delivery.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send bulk notifications",
        variant: "destructive"
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'certificate_expiry': return <Clock className="h-4 w-4" />;
      case 'payment_due': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading notification system...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Smart Notification System</h2>
        <Button onClick={triggerBulkNotifications} className="bg-primary text-primary-foreground">
          <Send className="h-4 w-4 mr-2" />
          Send Bulk Reminders
        </Button>
      </div>

      {/* Notification Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Notification Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                {getTypeIcon(rule.type)}
                <div>
                  <h3 className="font-medium capitalize">
                    {rule.type.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Trigger {rule.trigger_days} days before event
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Select 
                  value={rule.trigger_days.toString()} 
                  onValueChange={(value) => updateRule(rule.id, { trigger_days: parseInt(value) })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rule.escalation_enabled}
                    onCheckedChange={(checked) => updateRule(rule.id, { escalation_enabled: checked })}
                  />
                  <span className="text-sm">Escalate</span>
                </div>
                
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Pending Notifications ({pendingNotifications.filter(n => n.status === 'pending').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingNotifications.map(notification => (
              <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(notification.type)}
                  <div>
                    <p className="font-medium">{notification.recipient}</p>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Scheduled for {new Date(notification.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge className={getPriorityColor(notification.priority)}>
                    {notification.priority}
                  </Badge>
                  
                  {notification.status === 'pending' && (
                    <Button 
                      size="sm" 
                      onClick={() => sendNotificationNow(notification.id)}
                      className="bg-primary text-primary-foreground"
                    >
                      Send Now
                    </Button>
                  )}
                  
                  {notification.status === 'sent' && (
                    <Badge className="bg-green-100 text-green-800">Sent</Badge>
                  )}
                </div>
              </div>
            ))}
            
            {pendingNotifications.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No pending notifications
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};