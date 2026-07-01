import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, FileCheck, Calendar, Shield, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface Certificate {
  id: string;
  certificate_number: string;
  course_id: string;
  issue_date: string;
  expiry_date: string;
  is_revoked: boolean;
  tier_badge?: string;
  certification_level?: 'agent' | 'manager';
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
      setCertificates((data || []) as Certificate[]);
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

  const downloadCertificate = async (cert: Certificate) => {
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();

      // BACKGROUND
      pdf.setFillColor(252, 250, 245);
      pdf.rect(0, 0, W, H, 'F');

      // OUTER BORDER double line
      pdf.setDrawColor(15, 82, 51);
      pdf.setLineWidth(3);
      pdf.rect(8, 8, W - 16, H - 16);
      pdf.setLineWidth(0.5);
      pdf.rect(12, 12, W - 24, H - 24);

      // CORNER ORNAMENTS
      const drawCorner = (x: number, y: number) => {
        pdf.setDrawColor(15, 82, 51);
        pdf.setLineWidth(1);
        pdf.line(x - 6, y, x + 6, y);
        pdf.line(x, y - 6, x, y + 6);
      };
      drawCorner(20, 20); drawCorner(W - 20, 20);
      drawCorner(20, H - 20); drawCorner(W - 20, H - 20);

      // HEADER BAND
      pdf.setFillColor(15, 82, 51);
      pdf.rect(12, 12, W - 24, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('MARYLAND CANNABIS ADMINISTRATION — RESPONSIBLE VENDOR TRAINING', W / 2, 22, { align: 'center' });
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ProCann Edu', W / 2, 34, { align: 'center' });

      // SEAL CIRCLE
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(15, 82, 51);
      pdf.setLineWidth(1.5);
      pdf.circle(50, 110, 22, 'FD');
      pdf.setFillColor(15, 82, 51);
      pdf.circle(50, 110, 18, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROCANN', 50, 105, { align: 'center' });
      pdf.text('EDU', 50, 111, { align: 'center' });
      pdf.text('RVT', 50, 117, { align: 'center' });

      // CERTIFICATE TYPE
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('CERTIFICATE OF COMPLETION — RESPONSIBLE VENDOR TRAINING', W / 2, 56, { align: 'center' });

      // GOLD DIVIDER
      pdf.setDrawColor(180, 140, 60);
      pdf.setLineWidth(0.5);
      pdf.line(W / 2 - 80, 59, W / 2 + 80, 59);

      // THIS CERTIFIES THAT
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('This certifies that', W / 2, 70, { align: 'center' });

      // RECIPIENT NAME — fetch from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .maybeSingle();
      const recipientName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email || 'Registered Agent'
        : user?.email || 'Registered Agent';

      pdf.setTextColor(15, 82, 51);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text(recipientName, W / 2, 88, { align: 'center' });
      pdf.setDrawColor(15, 82, 51);
      pdf.setLineWidth(0.5);
      const nameWidth = pdf.getTextWidth(recipientName);
      pdf.line(W / 2 - nameWidth / 2, 91, W / 2 + nameWidth / 2, 91);

      // HAS SUCCESSFULLY COMPLETED
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('has successfully completed the Maryland Responsible Vendor Training program', W / 2, 101, { align: 'center' });

      // COURSE TITLE
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cert.courses.title, W / 2, 113, { align: 'center' });

      // COMAR BADGE
      const badgeW = 120;
      pdf.setFillColor(240, 253, 244);
      pdf.setDrawColor(15, 82, 51);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(W / 2 - badgeW / 2, 118, badgeW, 10, 3, 3, 'FD');
      pdf.setTextColor(15, 82, 51);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('COMAR 14.17.15.05 — Maryland Cannabis Administration', W / 2, 125, { align: 'center' });

      // BOTTOM 3 COLUMNS
      const issueDate = formatDate(cert.issue_date);
      const expiryDate = cert.expiry_date ? formatDate(cert.expiry_date) : 'No Expiry';

      // Left — Issue Date
      pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
      pdf.line(W / 2 - 95, 148, W / 2 - 35, 148);
      pdf.setTextColor(20, 20, 20); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
      pdf.text(issueDate, W / 2 - 65, 145, { align: 'center' });
      pdf.setTextColor(120, 120, 120); pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      pdf.text('DATE OF ISSUE', W / 2 - 65, 153, { align: 'center' });

      // Center — Cert Number
      pdf.setDrawColor(200, 200, 200);
      pdf.line(W / 2 - 25, 148, W / 2 + 25, 148);
      pdf.setTextColor(20, 20, 20); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
      pdf.text(cert.certificate_number, W / 2, 145, { align: 'center' });
      pdf.setTextColor(120, 120, 120); pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      pdf.text('CERTIFICATE NUMBER', W / 2, 153, { align: 'center' });

      // Right — Expiry Date
      pdf.setDrawColor(200, 200, 200);
      pdf.line(W / 2 + 35, 148, W / 2 + 95, 148);
      pdf.setTextColor(20, 20, 20); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
      pdf.text(expiryDate, W / 2 + 65, 145, { align: 'center' });
      pdf.setTextColor(120, 120, 120); pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      pdf.text('EXPIRATION DATE', W / 2 + 65, 153, { align: 'center' });

      // VERIFY URL
      pdf.setTextColor(37, 99, 235); pdf.setFontSize(7);
      pdf.text(`Verify: https://www.procannedu.com/verify?code=${cert.certificate_number}`, W / 2, 163, { align: 'center' });

      // FOOTER
      pdf.setFillColor(15, 82, 51);
      pdf.rect(12, H - 24, W - 24, 12, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal');
      pdf.text(
        'This certificate satisfies Maryland Cannabis Administration Responsible Vendor Training requirements per COMAR 14.17.15.05. Valid for 2 years from date of issue.',
        W / 2, H - 16, { align: 'center' }
      );

      pdf.save(`${cert.certificate_number}-RVT-certificate.pdf`);

      toast({ title: 'Certificate Downloaded', description: `${cert.certificate_number} is ready.` });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Download Failed', description: 'Failed to generate PDF. Please try again.', variant: 'destructive' });
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
                      <div className="flex gap-2 flex-wrap">
                        {certificate.certification_level === 'manager' && (
                          <Badge className="bg-purple-600 text-white">
                            👔 MANAGER LEVEL
                          </Badge>
                        )}
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
            <li>• <strong>Agent-Level:</strong> Covers all 18 required RVT modules</li>
            <li>• <strong>Manager-Level:</strong> Includes 5 additional management modules (23 total)</li>
            <li>• Download certificates for your records or employer verification</li>
            <li>• Valid certificates are recognized throughout Maryland's cannabis industry</li>
          </ul>
        </div>
      </div>
    </div>
  );
}