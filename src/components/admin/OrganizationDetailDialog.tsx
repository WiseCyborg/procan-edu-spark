import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, CreditCard, Award, History, Settings, 
  CheckCircle, Loader2, Copy, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';

interface OrganizationDetailDialogProps {
  organizationId: string | null;
  onClose: () => void;
}

export const OrganizationDetailDialog = ({ organizationId, onClose }: OrganizationDetailDialogProps) => {
  const [activeTab, setActiveTab] = useState('staff');

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['org-employees', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase.rpc('get_organization_employees', {
        org_id: organizationId
      });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: seats, isLoading: loadingSeats } = useQuery({
    queryKey: ['org-seats', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('rvt_seats')
        .select('id, status, assigned_user_id, assigned_at, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: certificates, isLoading: loadingCerts } = useQuery({
    queryKey: ['org-certificates', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase.rpc('get_organization_certificates', {
        org_id: organizationId
      });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const handleCopyCertificateLink = (certNumber: string) => {
    const link = `https://www.procannedu.com/verify-certificate?cert=${certNumber}`;
    navigator.clipboard.writeText(link);
    toast.success('Verification link copied');
  };

  if (!organizationId) return null;

  return (
    <Dialog open={!!organizationId} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Organization Details</DialogTitle>
          <DialogDescription>
            Complete overview of organization staff, seats, and certificates
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="staff" className="gap-2">
              <Users className="h-4 w-4" />
              Staff ({employees?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="seats" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Seats ({seats?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-2">
              <Award className="h-4 w-4" />
              Certificates ({certificates?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="space-y-4">
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No employees found
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees?.map((emp: any) => (
                        <TableRow key={emp.user_id}>
                          <TableCell>
                            <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                            <div className="text-xs text-muted-foreground">{emp.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {emp.role?.replace('_', ' ').toUpperCase() || 'STUDENT'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium">{emp.progress_percentage}%</div>
                              <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${emp.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{emp.current_tier}</Badge>
                          </TableCell>
                          <TableCell>
                            {emp.certificate_status === 'valid' ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Certified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{emp.certificate_status}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="seats" className="space-y-4">
            {loadingSeats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {seats?.filter(s => s.status === 'available').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Available</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                      {seats?.filter(s => s.status === 'assigned').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Assigned</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {seats?.filter(s => s.status === 'used').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Used</div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seat ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seats?.map((seat: any) => (
                        <TableRow key={seat.id}>
                          <TableCell className="font-mono text-xs">
                            {seat.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                seat.status === 'available' ? 'default' : 
                                seat.status === 'assigned' ? 'secondary' : 
                                'outline'
                              }
                            >
                              {seat.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {seat.assigned_user_id ? (
                              <span className="font-mono text-xs">
                                {seat.assigned_user_id.substring(0, 8)}...
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(seat.assigned_at || seat.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            {loadingCerts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Certificate #</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No certificates issued yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      certificates?.map((cert: any) => (
                        <TableRow key={cert.certificate_id}>
                          <TableCell className="font-mono text-sm">
                            {cert.certificate_number}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{cert.first_name} {cert.last_name}</div>
                            <div className="text-xs text-muted-foreground">{cert.email}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(cert.issued_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(cert.expiry_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCertificateLink(cert.certificate_number)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/verify-certificate?cert=${cert.certificate_number}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="text-center py-12 text-muted-foreground">
              Activity timeline coming soon
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};