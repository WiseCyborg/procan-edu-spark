import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  UserPlus, 
  Send, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Copy,
  RefreshCw,
  Download,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

interface Organization {
  id: string;
  name: string;
  unique_access_key: string;
  course_credits: number;
  available_seats: number;
}

export const StaffInvitationSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
  // Form states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [customMessage, setCustomMessage] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInvitations(),
        fetchOrganizations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load invitation data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('staff_invitations')
      .select(`
        *,
        organizations(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return;
    }

    setInvitations(data || []);
  };

  const fetchOrganizations = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, unique_access_key, course_credits')
      .eq('admin_approved', true)
      .eq('payment_status', 'paid')
      .order('name');

    if (error) {
      console.error('Error fetching organizations:', error);
      return;
    }

    // Fetch available seats for each organization
    const orgsWithSeats = await Promise.all((data || []).map(async (org) => {
      const { data: seatData } = await supabase
        .rpc('get_organization_seat_status', { org_id: org.id });
      
      const seatStatus = Array.isArray(seatData) ? seatData[0] : seatData;
      
      return {
        ...org,
        available_seats: seatStatus?.available || 0
      };
    }));

    setOrganizations(orgsWithSeats);
  };

  const checkSeatAvailability = async (orgId: string): Promise<boolean> => {
    const { data: seatData } = await supabase
      .rpc('get_organization_seat_status', { org_id: orgId });
    
    const seatStatus = Array.isArray(seatData) ? seatData[0] : seatData;
    
    if (!seatStatus || seatStatus.available === 0) {
      toast({
        title: "No Seats Available",
        description: "This organization has no available training seats. Purchase more seats before inviting employees.",
        variant: "destructive",
      });
      return false;
    }
    
    if (seatStatus.available < 3) {
      toast({
        title: "Low Seat Inventory",
        description: `Only ${seatStatus.available} seats remaining. Consider purchasing more.`,
      });
    }
    
    return true;
  };

  const sendSingleInvitation = async () => {
    if (!inviteEmail || !selectedOrganization) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check seat availability first
    const hasSeats = await checkSeatAvailability(selectedOrganization);
    if (!hasSeats) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'invite_single',
          organizationId: selectedOrganization,
          inviterId: user?.id,
          email: inviteEmail,
          role: inviteRole,
          customMessage: customMessage || undefined
        }
      });

      if (error) {
        console.error("Staff invitation error:", error);
        toast({
          title: "Invitation Failed",
          description: error.message?.includes('404') || error.message?.includes('FunctionsHttpError')
            ? "Email service temporarily unavailable. Please contact support."
            : `Failed to send invitation: ${error.message}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Invitation Sent",
        description: `Successfully invited ${inviteEmail}`,
      });

      // Clear form and refresh data
      setInviteEmail('');
      setCustomMessage('');
      setInviteDialogOpen(false);
      fetchInvitations();
    } catch (error: any) {
      console.error("Staff invitation exception:", error);
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
    const emails = bulkEmails.split('\n').filter(email => email.trim());
    
    if (emails.length === 0 || !selectedOrganization) {
      toast({
        title: "Error",
        description: "Please enter email addresses and select an organization",
        variant: "destructive"
      });
      return;
    }

    // Check seat availability first
    const hasSeats = await checkSeatAvailability(selectedOrganization);
    if (!hasSeats) {
      return;
    }

    // Check if enough seats for bulk operation
    const { data: seatData } = await supabase
      .rpc('get_organization_seat_status', { org_id: selectedOrganization });

    const seatStatus = Array.isArray(seatData) ? seatData[0] : seatData;

    if (seatStatus && emails.length > seatStatus.available) {
      toast({
        title: "Insufficient Seats",
        description: `You're inviting ${emails.length} employees but only have ${seatStatus.available} seats available.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'invite_bulk',
          organizationId: selectedOrganization,
          inviterId: user?.id,
          emails: emails,
          role: inviteRole,
          customMessage: customMessage || undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Bulk Invitations Sent",
        description: `Successfully sent ${data.invitations_sent} invitations`,
      });

      setBulkEmails('');
      setCustomMessage('');
      fetchInvitations();
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
        description: "Successfully resent invitation",
      });

      fetchInvitations();
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

  const copyAccessKey = (accessKey: string) => {
    navigator.clipboard.writeText(accessKey);
    toast({
      title: "Copied",
      description: "Access key copied to clipboard",
    });
  };

  const generateInvitationLink = (invitation: StaffInvitation) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth?invitation=${invitation.invitation_token}`;
  };

  const exportInvitations = () => {
    const csvData = invitations.map(inv => ({
      'Email': inv.email,
      'Role': inv.role,
      'Organization': (inv as any).organizations?.name || 'Unknown',
      'Status': inv.accepted_at ? 'Accepted' : 'Pending',
      'Created': new Date(inv.created_at).toLocaleDateString(),
      'Expires': new Date(inv.expires_at).toLocaleDateString(),
      'Accepted': inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString() : 'Not yet'
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff-invitations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (invitation: StaffInvitation) => {
    if (invitation.accepted_at) {
      return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
    }
    
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }
    
    return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
  };

  const getInvitationStats = () => {
    const total = invitations.length;
    const accepted = invitations.filter(inv => inv.accepted_at).length;
    const pending = invitations.filter(inv => !inv.accepted_at && new Date(inv.expires_at) >= new Date()).length;
    const expired = invitations.filter(inv => !inv.accepted_at && new Date(inv.expires_at) < new Date()).length;
    
    return { total, accepted, pending, expired };
  };

  const stats = getInvitationStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff Invitation System</h2>
          <p className="text-muted-foreground">Manage staff invitations and access keys</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportInvitations}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Send Staff Invitation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                <SelectItem 
                  key={org.id} 
                  value={org.id}
                  disabled={org.available_seats === 0}
                >
                  {org.name} - {org.available_seats} seats available
                  {org.available_seats === 0 && " (No seats - purchase more)"}
                </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />

                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="dispensary_manager">Dispensary Manager</SelectItem>
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Custom message (optional)"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                />

                <Button 
                  onClick={sendSingleInvitation}
                  disabled={loading || !inviteEmail || !selectedOrganization}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invitations</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invitations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Recent Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.slice(0, 10).map((invitation) => (
                <div key={invitation.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {(invitation as any).organizations?.name || 'Unknown Organization'}
                      </p>
                    </div>
                    {getStatusBadge(invitation)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      <span>Created: {new Date(invitation.created_at).toLocaleDateString()}</span>
                      <span className="ml-3">
                        Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                    {!invitation.accepted_at && new Date(invitation.expires_at) >= new Date() && (
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
            </div>
          </CardContent>
        </Card>

        {/* Bulk Invitations & Access Keys */}
        <div className="space-y-6">
          {/* Bulk Invitations */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Invitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.course_credits} credits)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Email addresses (one per line)"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={4}
              />

              <Select value={inviteRole} onValueChange={setInviteRole}>
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
                disabled={loading || !bulkEmails.trim() || !selectedOrganization}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Bulk Invitations
              </Button>
            </CardContent>
          </Card>

          {/* Organization Access Keys */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Access Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {organizations.slice(0, 5).map((org) => (
                  <div key={org.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {org.unique_access_key}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{org.course_credits} credits</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyAccessKey(org.unique_access_key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StaffInvitationSystem;