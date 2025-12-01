import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Search, CheckCircle, XCircle, Calendar, Award, Lock, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface CertificateStatus {
  certificate_number: string;
  status: string;
  issue_date: string;
  expiry_date: string | null;
  course_title: string | null;
}

const CertificateVerification = () => {
  const [searchParams] = useSearchParams();
  const [certificateNumber, setCertificateNumber] = useState('');
  const [certificate, setCertificate] = useState<CertificateStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-verify if cert parameter is present
  useEffect(() => {
    const certParam = searchParams.get('cert');
    if (certParam) {
      setCertificateNumber(certParam);
      // Trigger verification after state is set
      setTimeout(() => {
        verifyCertificate();
      }, 100);
    }
  }, [searchParams]);

  const verifyCertificate = async () => {
    if (!certificateNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a certificate number",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // First check consumer certificates (CON-YYYY-XXXXXX format)
      if (certificateNumber.trim().startsWith('CON-')) {
        const { data: consumerCert, error: consumerError } = await supabase
          .from('consumer_certificates')
          .select('certificate_number, badge_name, issue_date')
          .eq('certificate_number', certificateNumber.trim())
          .single();

        if (consumerCert && !consumerError) {
          setCertificate({
            certificate_number: consumerCert.certificate_number,
            status: 'valid',
            issue_date: consumerCert.issue_date,
            expiry_date: null, // Consumer certs don't expire
            course_title: consumerCert.badge_name,
          });
          return;
        }
      }

      // Fall back to RVT certificate check
      const { data, error } = await supabase
        .rpc('verify_certificate_status', { cert_number: certificateNumber.trim() });

      if (error) {
        console.error('Verification error:', error);
        toast({
          title: "Error",
          description: "Unable to verify certificate. Please try again.",
          variant: "destructive"
        });
        setCertificate(null);
        return;
      }

      const result = data?.[0] || null;
      setCertificate(result);
      
      if (!result) {
        toast({
          title: "Certificate Not Found",
          description: "No certificate found with this number. Please check and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during verification.",
        variant: "destructive"
      });
      setCertificate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyCertificate();
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

  const getCertificateStatus = (cert: CertificateStatus) => {
    if (cert.status === 'revoked') {
      return { status: 'revoked', color: 'bg-red-100 text-red-800', label: 'Revoked' };
    }
    if (cert.status === 'expired') {
      return { status: 'expired', color: 'bg-yellow-100 text-yellow-800', label: 'Expired' };
    }
    return { status: 'valid', color: 'bg-green-100 text-green-800', label: 'Valid' };
  };

  const copyVerificationLink = async () => {
    const link = `${window.location.origin}/verify-certificate?cert=${certificateNumber}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Verification link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-green-700 mb-4">
            Certificate Verification
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Verify the authenticity and validity of ProCann Edu certificates. 
            Enter a certificate number below to check its current status.
          </p>
        </div>

        {/* Security Notice for Public Access */}
        {!user && (
          <div className="max-w-2xl mx-auto mb-6">
            <Alert className="border-blue-200 bg-blue-50">
              <Lock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                <strong>Public Verification:</strong> This service only shows certificate validity status. 
                For full certificate details, please log in to your account.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <Search className="mr-2 h-5 w-5" />
                Verify Certificate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    type="text"
                    placeholder="Enter certificate number (e.g., CERT-2024-001-1234)"
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button 
                    onClick={verifyCertificate}
                    disabled={loading}
                    className="px-8"
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Certificate numbers are case-sensitive and follow the format: CERT-YYYY-DDD-XXXX
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {searched && (
          <div className="max-w-4xl mx-auto">
            {certificate ? (
              <Card className="border-green-200">
                <CardHeader className="bg-green-50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center text-green-700">
                      <Award className="mr-2 h-6 w-6" />
                      Certificate Details
                    </div>
                    <Badge className={getCertificateStatus(certificate).color}>
                      {getCertificateStatus(certificate).label}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Certificate Info */}
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-4">Certificate Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Certificate Number:</span>
                          <span className="font-mono font-medium">{certificate.certificate_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Course:</span>
                          <span className="font-medium">{certificate.course_title || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Issue Date:</span>
                          <span>{formatDate(certificate.issue_date)}</span>
                        </div>
                        {certificate.expiry_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expiry Date:</span>
                            <span className={certificate.status === 'expired' ? 'text-red-600 font-medium' : ''}>
                              {formatDate(certificate.expiry_date)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Copy Verification Link Button */}
                    <div className="pt-4 border-t">
                      <Button
                        onClick={copyVerificationLink}
                        variant="outline"
                        className="w-full"
                      >
                        {copied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Link Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Verification Link
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Privacy Notice */}
                    <Alert className="border-gray-200 bg-gray-50">
                      <Lock className="h-4 w-4 text-gray-600" />
                      <AlertDescription className="text-gray-700">
                        <strong>Privacy Protection:</strong> Personal information is not displayed in public verification. 
                        Only certificate validity status is shown for security purposes.
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Status Alerts */}
                  <div className="mt-6 space-y-4">
                    {getCertificateStatus(certificate).status === 'valid' && (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700">
                          This certificate is valid and has been verified as authentic.
                        </AlertDescription>
                      </Alert>
                    )}

                    {getCertificateStatus(certificate).status === 'expired' && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <Calendar className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-700">
                          This certificate has expired. The holder may need to renew their certification.
                        </AlertDescription>
                      </Alert>
                    )}

                    {getCertificateStatus(certificate).status === 'revoked' && (
                      <Alert className="border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">
                          This certificate has been revoked and is no longer valid.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      <strong>Certificate Not Found</strong><br />
                      No certificate was found with the number "{certificateNumber}". 
                      Please verify the certificate number and try again.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">For Employers</h4>
                  <p className="text-gray-600 text-sm">
                    Use this tool to verify employee certifications. Valid certificates ensure 
                    compliance with Maryland Cannabis Administration requirements.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">For Certificate Holders</h4>
                  <p className="text-gray-600 text-sm">
                    Share your certificate number with employers for verification. 
                    Keep track of your expiry date to ensure continuous compliance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerification;