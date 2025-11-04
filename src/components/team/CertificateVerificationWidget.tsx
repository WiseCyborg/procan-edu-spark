import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CertificateVerificationWidgetProps {
  organizationId: string;
}

export const CertificateVerificationWidget: React.FC<CertificateVerificationWidgetProps> = ({ organizationId }) => {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, [organizationId]);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_organization_certificates' as any, { org_id: organizationId });
      
      if (error) throw error;
      setCertificates((data as any) || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center py-8">Loading certificates...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or certificate number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredCertificates.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No certificates found
        </p>
      ) : (
        <div className="space-y-2">
          {filteredCertificates.map((cert) => (
            <Card key={cert.certificate_id} className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">
                        {cert.first_name} {cert.last_name}
                      </p>
                      {cert.is_revoked ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Revoked
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Valid
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Certificate: {cert.certificate_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issued: {new Date(cert.issued_at).toLocaleDateString()} | 
                      Expires: {new Date(cert.expiry_date).toLocaleDateString()} |
                      Verified: {cert.verification_count} times
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/verify-certificate?number=${cert.certificate_number}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Verify
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
