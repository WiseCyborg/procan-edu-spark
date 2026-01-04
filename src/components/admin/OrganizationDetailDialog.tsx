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
  CreditCard, Award, History, Shield,
  Loader2, Copy, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import { OrgMembersRolesTab } from './OrgMembersRolesTab';
import { OrgSeatsManagementTab } from './OrgSeatsManagementTab';

interface OrganizationDetailDialogProps {
  organizationId: string | null;
  onClose: () => void;
}

export const OrganizationDetailDialog = ({ organizationId, onClose }: OrganizationDetailDialogProps) => {
  const [activeTab, setActiveTab] = useState('members');

  const { data: members } = useQuery({
    queryKey: ['org-members-count', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: seats } = useQuery({
    queryKey: ['org-seats-count', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('rvt_seats')
        .select('id')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return data || [];
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
            Manage members, roles, training seats, and certificates
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members" className="gap-2">
              <Shield className="h-4 w-4" />
              Members & Roles ({members?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="seats" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Training Seats ({seats?.length || 0})
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

          <TabsContent value="members" className="space-y-4">
            <OrgMembersRolesTab organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="seats" className="space-y-4">
            <OrgSeatsManagementTab organizationId={organizationId} />
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