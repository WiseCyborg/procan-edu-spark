import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Search, CheckCircle, XCircle, Calendar, Award, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface FullCertificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string | null;
  is_revoked: boolean;
  course_id: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
  courses: {
    title: string;
  } | null;
}

const SecureCertificateVerification = () => {
  const [certificateNumber, setCertificateNumber] = useState('');
  const [certificate, setCertificate] = useState<FullCertificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

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
      // Admins and authenticated users can see full certificate details
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          profiles:user_id (first_name, last_name),
          courses:course_id (title)
        `)
        .eq('certificate_number', certificateNumber.trim())
        .maybeSingle();

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

      setCertificate(data as any);
      
      if (!data) {
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

  const getCertificateStatus = (cert: FullCertificate) => {
    if (cert.is_revoked) {
      return { status: 'revoked', color: 'bg-red-100 text-red-800', label: 'Revoked' };
    }
    if (cert.expiry_date && isExpired(cert.expiry_date)) {
      return { status: 'expired', color: 'bg-yellow-100 text-yellow-800', label: 'Expired' };
    }
    return { status: 'valid', color: 'bg-green-100 text-green-800', label: 'Valid' };
  };

  // Redirect non-authenticated users to public verification
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Alert className="max-w-2xl mx-auto">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Authentication Required:</strong> This page requires login to view full certificate details. 
                <br />
                <a href="/verify-certificate" className="text-primary underline">
                  Use public verification
                </a> to check certificate validity status only.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-green-700 mb-4">
            Secure Certificate Verification
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {isAdmin 
              ? "Administrative access: View complete certificate details including personal information."
              : "Authenticated access: View your certificates and limited details for verification purposes."
            }
          </p>
        </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Certificate Info */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Certificate Information</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Certificate Number:</span>
                            <span className="font-mono font-medium">{certificate.certificate_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Course:</span>
                            <span className="font-medium">{certificate.courses?.title || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Issue Date:</span>
                            <span>{formatDate(certificate.issue_date)}</span>
                          </div>
                          {certificate.expiry_date && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Expiry Date:</span>
                              <span className={isExpired(certificate.expiry_date) ? 'text-red-600 font-medium' : ''}>
                                {formatDate(certificate.expiry_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Holder Info - Only show to admin or certificate owner */}
                    {(isAdmin || certificate.user_id === user.id) && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-gray-700 mb-2">Certificate Holder</h3>
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {certificate.profiles?.first_name} {certificate.profiles?.last_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
      </div>
    </div>
  );
};

export default SecureCertificateVerification;