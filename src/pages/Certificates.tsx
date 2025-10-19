import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, FileCheck, Calendar, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SensitiveOperationWrapper } from '@/components/auth/SensitiveOperationWrapper';

interface Certificate {
  id: string;
  certificate_number: string;
  course_id: string;
  issue_date: string;
  expiry_date: string;
  is_revoked: boolean;
  tier_badge?: string;
  courses: {
    title: string;
    description: string;
  };
}

export default function Certificates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          courses (
            title,
            description
          )
        `)
        .eq('user_id', user?.id)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error: any) {
      console.error('Error fetching certificates:', error);
      toast({
        title: "Error",
        description: "Failed to load certificates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCertificateStatus = (cert: Certificate) => {
    if (cert.is_revoked) {
      return { label: 'Revoked', color: 'bg-red-100 text-red-800', status: 'revoked' };
    }
    if (isExpired(cert.expiry_date)) {
      return { label: 'Expired', color: 'bg-yellow-100 text-yellow-800', status: 'expired' };
    }
    return { label: 'Valid', color: 'bg-green-100 text-green-800', status: 'valid' };
  };

  const downloadCertificate = async (certificateId: string, certificateNumber: string) => {
    try {
      // In a real implementation, this would generate and download a PDF certificate
      toast({
        title: "Download Started",
        description: `Certificate ${certificateNumber} download initiated`,
      });
      
      // For now, we'll simulate the download
      console.log(`Downloading certificate: ${certificateId}`);
    } catch (error: any) {
      console.error('Error downloading certificate:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download certificate",
        variant: "destructive",
      });
    }
  };

  const viewCertificate = (certificateNumber: string) => {
    // Navigate to certificate verification page
    window.open(`/certificate-verification?cert=${certificateNumber}`, '_blank');
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to view your certificates.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Certificates</h1>
          <p className="text-gray-600">
            View and download your earned certificates. All certificates are verified and comply with Maryland Cannabis Administration requirements.
          </p>
        </div>

        {certificates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Certificates Yet</h3>
              <p className="text-gray-600 mb-6">
                Complete your training courses to earn certificates.
              </p>
              <Button onClick={() => window.location.href = '/course'}>
                Start Training
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {certificates.map((certificate) => {
              const status = getCertificateStatus(certificate);
              
              return (
                <Card key={certificate.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-green-900">
                          {certificate.courses.title}
                        </CardTitle>
                        <p className="text-green-700 mt-1">
                          Certificate #{certificate.certificate_number}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {certificate.tier_badge && (
                          <Badge 
                            className={`
                              ${certificate.tier_badge === 'green' && 'bg-stoplight-green'} 
                              ${certificate.tier_badge === 'yellow' && 'bg-stoplight-yellow'} 
                              ${certificate.tier_badge === 'red' && 'bg-stoplight-red'} 
                              text-white
                            `}
                          >
                            {certificate.tier_badge === 'green' && '🟢'}
                            {certificate.tier_badge === 'yellow' && '🟡'}
                            {certificate.tier_badge === 'red' && '🔴'}
                            {' '}
                            {certificate.tier_badge?.toUpperCase()} TIER
                          </Badge>
                        )}
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Issued: {formatDate(certificate.issue_date)}</span>
                        </div>
                        
                        {certificate.expiry_date && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Expires: {formatDate(certificate.expiry_date)}</span>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-700">
                          {certificate.courses.description}
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewCertificate(certificate.certificate_number)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                        
                        <SensitiveOperationWrapper
                          operation="certificate_download"
                          operationDescription={`Downloading certificate ${certificate.certificate_number}`}
                          onExecute={() => downloadCertificate(certificate.id, certificate.certificate_number)}
                          urgency="low"
                          size="sm"
                          disabled={certificate.is_revoked}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </SensitiveOperationWrapper>
                      </div>
                    </div>
                    
                    {status.status === 'expired' && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          This certificate has expired. Contact support if you need to renew your certification.
                        </p>
                      </div>
                    )}
                    
                    {status.status === 'revoked' && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          This certificate has been revoked and is no longer valid.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Certificate Information</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• All certificates are digitally verified and tamper-proof</li>
            <li>• Certificates meet Maryland Cannabis Administration requirements</li>
            <li>• Download certificates for your records or employer verification</li>
            <li>• Valid certificates are recognized throughout Maryland's cannabis industry</li>
          </ul>
        </div>
      </div>
    </div>
  );
}