import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, CheckCircle2, XCircle, Loader2, Search, Award, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVerifyCertificate } from '@/hooks/useCertificateIssuance';

interface VerificationResult {
  valid: boolean;
  status?: string;
  certificate_name?: string;
  course_title?: string;
  issued_at?: string;
  recipient_name?: string;
  is_compliance?: boolean;
  verification_code?: string;
  reason?: string;
}

const VerifyCertificate = () => {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const { mutate: verify, isPending } = useVerifyCertificate();

  const handleVerify = () => {
    if (!code.trim()) return;
    
    verify(code.trim(), {
      onSuccess: (data) => {
        setResult(data as unknown as VerificationResult);
      },
      onError: () => {
        setResult({ valid: false, reason: 'verification_failed' });
      }
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Shield className="h-4 w-4" />
            Certificate Verification
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Verify a Certificate
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enter a certificate verification code to confirm its authenticity.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto space-y-8">
          {/* Search Box */}
          <Card>
            <CardHeader>
              <CardTitle>Enter Verification Code</CardTitle>
              <CardDescription>
                The code is printed on the certificate (e.g., RVT-202601-A3K9QZ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code..."
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="font-mono"
                />
                <Button onClick={handleVerify} disabled={isPending || !code.trim()}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card className={result.valid 
              ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20" 
              : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
            }>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {result.valid ? (
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div>
                    <CardTitle className={result.valid ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                      {result.valid ? 'Valid Certificate' : 'Invalid or Not Found'}
                    </CardTitle>
                    {result.status === 'revoked' && (
                      <Badge variant="destructive">Revoked</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {result.valid && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Certificate</p>
                        <p className="font-medium">{result.certificate_name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Issued To</p>
                        <p className="font-medium">{result.recipient_name || 'Certificate Holder'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Issue Date</p>
                        <p className="font-medium">{result.issued_at ? formatDate(result.issued_at) : 'N/A'}</p>
                      </div>
                    </div>

                    {result.course_title && (
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Course</p>
                          <p className="font-medium">{result.course_title}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {result.is_compliance && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-primary font-medium">
                        ✓ This is an official Maryland Compliance Certificate
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center font-mono">
                      Verification Code: {result.verification_code}
                    </p>
                  </div>
                </CardContent>
              )}

              {!result.valid && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {result.reason === 'not_found' 
                      ? 'No certificate found with this verification code. Please check the code and try again.'
                      : 'Unable to verify this certificate. Please contact support if you believe this is an error.'}
                  </p>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
