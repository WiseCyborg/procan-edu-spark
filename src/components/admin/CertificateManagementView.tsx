import { useState } from 'react';
import { useCertificateManagement } from '@/hooks/useCertificateManagement';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Download, 
  Mail, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const CertificateManagementView = () => {
  const { certificates, loading, filter, setFilter, expiringCount, revokeCertificate } = useCertificateManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());

  const handleResendCertificate = async (cert: typeof certificates[0]) => {
    setResendingIds(prev => new Set(prev).add(cert.id));
    try {
      const { data, error } = await supabase.functions.invoke('resend-certificate', {
        body: { certificate_id: cert.id }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success('Certificate email resent', {
          description: `Certificate ${cert.certificate_number} resent to ${cert.user_email}`
        });
      } else {
        throw new Error(data?.error || 'Failed to resend certificate email');
      }
    } catch (error: any) {
      console.error('Error resending certificate:', error);
      toast.error('Failed to resend certificate email', {
        description: error?.message || 'An unexpected error occurred'
      });
    } finally {
      setResendingIds(prev => {
        const next = new Set(prev);
        next.delete(cert.id);
        return next;
      });
    }
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (cert: typeof certificates[0]) => {
    if (cert.is_revoked) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground"><Ban className="h-3 w-3 mr-1" />Revoked</Badge>;
    }
    
    const expiryDate = new Date(cert.expiry_date);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (expiryDate <= now) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    if (expiryDate <= thirtyDaysFromNow) {
      return <Badge variant="outline" className="bg-warning/10 text-warning"><AlertTriangle className="h-3 w-3 mr-1" />Expiring Soon</Badge>;
    }
    return <Badge variant="outline" className="bg-success/10 text-success"><CheckCircle2 className="h-3 w-3 mr-1" />Valid</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Certificate Management</h2>
        <p className="text-muted-foreground">
          Manage all training certificates across organizations
        </p>
      </div>

      {/* Expiring Alert */}
      {expiringCount > 0 && (
        <Card className="border-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-semibold">
                    {expiringCount} certificate{expiringCount !== 1 ? 's' : ''} expiring within 30 days
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Consider sending renewal reminders
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Reminders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, cert #, or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter certificates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Certificates</SelectItem>
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Certificates Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certificate #</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCertificates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No certificates found
                </TableCell>
              </TableRow>
            ) : (
              filteredCertificates.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell className="font-medium">{cert.certificate_number}</TableCell>
                  <TableCell>
                    <p className="font-medium">{cert.user_name}</p>
                  </TableCell>
                  <TableCell>{cert.organization_name}</TableCell>
                  <TableCell>{formatDate(cert.issue_date)}</TableCell>
                  <TableCell>{formatDate(cert.expiry_date)}</TableCell>
                  <TableCell>{getStatusBadge(cert)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      {!cert.is_revoked && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => revokeCertificate(cert.id, 'Admin action')}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
