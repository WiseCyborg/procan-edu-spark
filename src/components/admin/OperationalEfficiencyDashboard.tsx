import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Send, 
  Users, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Settings,
  TrendingUp,
  Mail,
  UserPlus,
  FileText,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationRule {
  id: string;
  type: string;
  enabled: boolean;
  trigger_days: number;
  message_template: string;
  escalation_enabled: boolean;
  target_roles: string[];
}

interface PendingNotification {
  id: string;
  type: string;
  recipient_email: string;
  subject: string;
  message: string;
  scheduled_for: string;
  priority: string;
  status: string;
  metadata: any;
}

interface StaffInvitation {
  id: string;
  email: string;
  role: string;
  invitation_token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  organization_id: string;
}

export const OperationalEfficiencyDashboard = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  
  // Notification state
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  
  // Staff invitation state
  const [staffInvitations, setStaffInvitations] = useState<StaffInvitation[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState('student');
  const [bulkInviteEmails, setBulkInviteEmails] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Analytics state
  const [analytics, setAnalytics] = useState({
    total_notifications_sent: 0,
    pending_notifications: 0,
    active_staff_invitations: 0,
    compliance_rate: 0,
    recent_activity: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchNotificationRules(),
        fetchPendingNotifications(),
        fetchStaffInvitations(),
        fetchAnalytics()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationRules = async () => {
    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .order('type');

    if (error) {
      console.error('Error fetching notification rules:', error);
      return;
    }

    setRules(data || []);
  };

  const fetchPendingNotifications = async () => {
    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_for')
      .limit(20);

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return;
    }

    // Transform data to match interface
    const transformedData = (data || []).map(item => ({
      ...item,
      type: (typeof item.metadata === 'object' && item.metadata && 'type' in item.metadata) 
        ? item.metadata.type as string 
        : 'general'
    }));

    setPendingNotifications(transformedData);
  };

  const fetchStaffInvitations = async () => {
    const { data, error } = await supabase
      .from('staff_invitations')
      .select('*')
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching staff invitations:', error);
      return;
    }

    setStaffInvitations(data || []);
  };

  const fetchAnalytics = async () => {
    try {
      // Get notification statistics
      const { data: notificationStats } = await supabase
        .from('notification_queue')
        .select('status');

      const sentCount = notificationStats?.filter(n => n.status === 'sent').length || 0;
      const pendingCount = notificationStats?.filter(n => n.status === 'pending').length || 0;

      // Get staff invitation statistics
      const { data: inviteStats } = await supabase
        .from('staff_invitations')
        .select('accepted_at');

      const activeInvites = inviteStats?.filter(i => !i.accepted_at).length || 0;

      // Calculate mock compliance rate
      const complianceRate = Math.floor(Math.random() * 30) + 70; // 70-100%

      setAnalytics({
        total_notifications_sent: sentCount,
        pending_notifications: pendingCount,
        active_staff_invitations: activeInvites,
        compliance_rate: complianceRate,
        recent_activity: [
          { type: 'notification', message: 'Certificate expiry reminders sent', time: '2 hours ago' },
          { type: 'invitation', message: '5 staff members invited', time: '4 hours ago' },
          { type: 'compliance', message: 'Weekly compliance report generated', time: '1 day ago' }
        ]
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const triggerAutomatedNotifications = async (type: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('automated-notifications', {
        body: { type }
      });

      if (error) throw error;

      toast({
        title: "Notifications Triggered",
        description: `Successfully processed ${type} notifications`
      });

      fetchPendingNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to trigger notifications: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendStaffInvitation = async () => {
    if (!newInviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'invite_single',
          organizationId: 'default-org', // This should come from context
          inviterId: 'current-user', // This should come from auth
          email: newInviteEmail,
          role: newInviteRole,
          customMessage
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Successfully invited ${newInviteEmail}`
      });

      setNewInviteEmail('');
      setCustomMessage('');
      fetchStaffInvitations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send invitation: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendBulkInvitations = async () => {
    const emails = bulkInviteEmails.split('\n').filter(email => email.trim());
    
    if (emails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'invite_bulk',
          organizationId: 'default-org',
          inviterId: 'current-user',
          emails: emails,
          role: newInviteRole,
          customMessage
        }
      });

      if (error) throw error;

      toast({
        title: "Bulk Invitations Sent",
        description: `Successfully sent ${data.invitations_sent} invitations`
      });

      setBulkInviteEmails('');
      setCustomMessage('');
      fetchStaffInvitations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send bulk invitations: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationRule = async (ruleId: string, updates: Partial<NotificationRule>) => {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      ));

      toast({
        title: "Rule Updated",
        description: "Notification rule updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update rule: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (loading && activeTab === 'overview') {
    return <div className="flex justify-center p-8">Loading operational dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Operational Efficiency Dashboard</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={() => triggerAutomatedNotifications('check_expiry')}
            variant="outline"
            disabled={loading}
          >
            <Clock className="h-4 w-4 mr-2" />
            Check Expiry
          </Button>
          <Button 
            onClick={() => triggerAutomatedNotifications('bulk_notification')}
            disabled={loading}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Pending
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Notifications Sent</p>
                    <p className="text-2xl font-bold text-foreground">{analytics.total_notifications_sent}</p>
                  </div>
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Notifications</p>
                    <p className="text-2xl font-bold text-foreground">{analytics.pending_notifications}</p>
                  </div>
                  <Bell className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Invitations</p>
                    <p className="text-2xl font-bold text-foreground">{analytics.active_staff_invitations}</p>
                  </div>
                  <UserPlus className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Compliance Rate</p>
                    <p className="text-2xl font-bold text-foreground">{analytics.compliance_rate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => triggerAutomatedNotifications('compliance_check')}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={loading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Compliance Report
                </Button>
                <Button 
                  onClick={() => triggerAutomatedNotifications('send_reminder')}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={loading}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Training Reminders
                </Button>
                <Button 
                  onClick={() => triggerAutomatedNotifications('onboard_staff')}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={loading}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Process Staff Onboarding
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-6">
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
                      <Bell className="h-4 w-4" />
                      <div>
                        <h3 className="font-medium capitalize">{rule.type.replace('_', ' ')}</h3>
                        <p className="text-sm text-muted-foreground">
                          Trigger {rule.trigger_days} days before event
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Select 
                        value={rule.trigger_days.toString()} 
                        onValueChange={(value) => updateNotificationRule(rule.id, { trigger_days: parseInt(value) })}
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
                        </SelectContent>
                      </Select>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.escalation_enabled}
                          onCheckedChange={(checked) => updateNotificationRule(rule.id, { escalation_enabled: checked })}
                        />
                        <span className="text-sm">Escalate</span>
                      </div>
                      
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => updateNotificationRule(rule.id, { enabled: checked })}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Pending Notifications ({pendingNotifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingNotifications.map(notification => (
                    <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-4 w-4" />
                        <div>
                          <p className="font-medium">{notification.recipient_email}</p>
                          <p className="text-sm text-muted-foreground">{notification.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            Scheduled for {new Date(notification.scheduled_for).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
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
        </TabsContent>

        <TabsContent value="staff">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="h-5 w-5 mr-2" />
                    Invite Single Staff Member
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                  />
                  
                  <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="dispensary_manager">Dispensary Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Textarea
                    placeholder="Custom message (optional)"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                  />
                  
                  <Button 
                    onClick={sendStaffInvitation}
                    disabled={loading || !newInviteEmail}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Bulk Staff Invitations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Email addresses (one per line)"
                    value={bulkInviteEmails}
                    onChange={(e) => setBulkInviteEmails(e.target.value)}
                    rows={6}
                  />
                  
                  <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="dispensary_manager">Dispensary Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={sendBulkInvitations}
                    disabled={loading || !bulkInviteEmails.trim()}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Bulk Invitations
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Active Staff Invitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staffInvitations.map(invitation => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Role: {invitation.role} • Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {staffInvitations.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No active staff invitations
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Workflow Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium">Certificate Expiry</h3>
                        <p className="text-sm text-muted-foreground">Daily automated checks</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                      <Switch checked={true} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium">Staff Onboarding</h3>
                        <p className="text-sm text-muted-foreground">Auto-welcome new staff</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                      <Switch checked={true} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium">Compliance Reports</h3>
                        <p className="text-sm text-muted-foreground">Weekly compliance checks</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                      <Switch checked={true} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Communication Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{analytics.total_notifications_sent}</p>
                    <p className="text-sm text-muted-foreground">Total Notifications Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">94%</p>
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">67%</p>
                    <p className="text-sm text-muted-foreground">Open Rate</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Email Delivery</span>
                      <span>94%</span>
                    </div>
                    <Progress value={94} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Email Opens</span>
                      <span>67%</span>
                    </div>
                    <Progress value={67} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Compliance Rate</span>
                      <span>{analytics.compliance_rate}%</span>
                    </div>
                    <Progress value={analytics.compliance_rate} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};