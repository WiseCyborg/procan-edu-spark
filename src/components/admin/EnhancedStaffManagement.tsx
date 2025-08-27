import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Send, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  organization_id: string;
  created_at: string;
  last_active: string;
  progress_percentage: number;
  certificates_count: number;
  status: 'active' | 'inactive' | 'pending';
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
  metadata: any;
}

interface CommunicationLog {
  id: string;
  user_id: string;
  communication_type: string;
  subject: string;
  content: string;
  recipient_email: string;
  delivery_status: string;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

export const EnhancedStaffManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  
  // Staff data
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [staffInvitations, setStaffInvitations] = useState<StaffInvitation[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Invitation state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState('student');
  const [customMessage, setCustomMessage] = useState('');
  const [bulkInviteEmails, setBulkInviteEmails] = useState('');

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStaffMembers(),
        fetchStaffInvitations(),
        fetchCommunicationLogs()
      ]);
    } catch (error) {
      console.error('Error fetching staff data:', error);
      toast({
        title: "Error",
        description: "Failed to load staff data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    // Mock data for now - would be replaced with actual database queries
    const mockStaffMembers: StaffMember[] = [
      {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@dispensary.com',
        role: 'student',
        organization_id: 'org-1',
        created_at: '2024-01-15T10:00:00Z',
        last_active: '2024-01-20T15:30:00Z',
        progress_percentage: 75,
        certificates_count: 2,
        status: 'active'
      },
      {
        id: '2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@dispensary.com',
        role: 'dispensary_manager',
        organization_id: 'org-1',
        created_at: '2024-01-10T09:00:00Z',
        last_active: '2024-01-21T11:15:00Z',
        progress_percentage: 100,
        certificates_count: 3,
        status: 'active'
      }
    ];
    
    setStaffMembers(mockStaffMembers);
  };

  const fetchStaffInvitations = async () => {
    const { data, error } = await supabase
      .from('staff_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff invitations:', error);
      return;
    }

    setStaffInvitations(data || []);
  };

  const fetchCommunicationLogs = async () => {
    const { data, error } = await supabase
      .from('communication_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching communication logs:', error);
      return;
    }

    setCommunicationLogs(data || []);
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
          organizationId: 'default-org',
          inviterId: 'current-user',
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
      setInviteDialogOpen(false);
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

  const resendInvitation = async (invitationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'resend_invitation',
          invitationId
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation Resent",
        description: "Successfully resent invitation"
      });

      fetchCommunicationLogs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to resend invitation: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStaffMembers = staffMembers.filter(member => {
    const matchesSearch = 
      member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'dispensary_manager': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Enhanced Staff Management</h2>
        <div className="flex space-x-2">
          <Button onClick={() => fetchStaffData()} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold text-foreground">{staffMembers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold text-foreground">
                      {staffMembers.filter(s => s.status === 'active').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Invitations</p>
                    <p className="text-2xl font-bold text-foreground">
                      {staffInvitations.filter(i => !i.accepted_at).length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Completion</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Math.round(staffMembers.reduce((acc, s) => acc + s.progress_percentage, 0) / staffMembers.length || 0)}%
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bulk Staff Invitations
                  </label>
                  <Textarea
                    placeholder="Email addresses (one per line)"
                    value={bulkInviteEmails}
                    onChange={(e) => setBulkInviteEmails(e.target.value)}
                    rows={6}
                  />
                </div>
                
                <div className="space-y-4">
                  <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="dispensary_manager">Dispensary Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Textarea
                    placeholder="Custom message for all invitations"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                  />
                  
                  <Button 
                    onClick={sendBulkInvitations}
                    disabled={loading || !bulkInviteEmails.trim()}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Bulk Invitations
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Staff Members ({filteredStaffMembers.length})
                </CardTitle>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="dispensary_manager">Manager</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredStaffMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{member.first_name} {member.last_name}</h3>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getRoleColor(member.role)}>
                            {member.role.replace('_', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">{member.progress_percentage}% Complete</p>
                      <p className="text-xs text-muted-foreground">
                        {member.certificates_count} certificates
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last active: {new Date(member.last_active).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {filteredStaffMembers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No staff members found matching your criteria
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Staff Invitations ({staffInvitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staffInvitations.map(invitation => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Role: {invitation.role} • 
                          Sent: {new Date(invitation.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(invitation.accepted_at ? 'accepted' : 'pending')}>
                        {invitation.accepted_at ? 'Accepted' : 'Pending'}
                      </Badge>
                      
                      {!invitation.accepted_at && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resendInvitation(invitation.id)}
                          disabled={loading}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Resend
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {staffInvitations.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No staff invitations found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="h-5 w-5 mr-2" />
                Communication History ({communicationLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {communicationLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{log.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          To: {log.recipient_email} • Type: {log.communication_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(log.delivery_status)}>
                        {log.delivery_status}
                      </Badge>
                      
                      {log.opened_at && (
                        <Badge className="bg-green-100 text-green-800">
                          Opened
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                
                {communicationLogs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No communication history found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};