import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, CheckCircle2, XCircle, Loader2, Search, Award, Calendar, User, Lock, QrCode, UserSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { GHOST_COURSE_IDS_PG_LIST } from '@/lib/ghostCourses';

interface VerificationResult {
  valid: boolean;
  status?: string;
  certificate_name?: string;
  course_title?: string;
  issued_at?: string;
  expiry_date?: string;
  recipient_name?: string;
  is_compliance?: boolean;
  verification_code?: string;
  reason?: string;
  method?: string;
  match_count?: number;
  message?: string;
  hint?: string;
}

const VerifyCertificate = () => {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  
  // Name search state
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Fetch courses for dropdown
  const { data: courses } = useQuery({
    queryKey: ['courses-for-verify'],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_active', true)
        .not('id', 'in', GHOST_COURSE_IDS_PG_LIST)
        .order('title');
      return data || [];
    }
  });

  // Auto-verify if code is in URL
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode);
      handleVerifyByCode(urlCode);
    }
  }, [searchParams]);

  const handleVerifyByCode = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code;
    if (!codeToVerify.trim()) return;

    setIsPending(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'track-certificate-verification',
        {
          body: {
            certificate_number: codeToVerify.trim(),
            verifier_info: { source: 'public_verify_page' },
          },
        }
      );

      if (error) throw error;

      if (!data || data.found === false) {
        setResult({ valid: false, reason: 'not_found', method: 'code' });
        return;
      }

      const status: string = data.status || 'valid';
      const cert = data.certificate || {};
      setResult({
        valid: status === 'valid',
        status,
        method: 'code',
        certificate_name: cert.tier_badge || 'Certificate',
        recipient_name: cert.holder_name,
        course_title: cert.organization,
        issued_at: cert.issue_date,
        expiry_date: cert.expiry_date,
        verification_code: cert.certificate_number,
        reason:
          status === 'revoked'
            ? 'revoked'
            : status === 'expired'
            ? 'expired'
            : undefined,
      });
    } catch (error) {
      console.error('Verification error:', error);
      setResult({ valid: false, reason: 'verification_failed', method: 'code' });
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyByName = async () => {
    if (!firstName.trim() || !lastInitial.trim()) return;
    
    setIsPending(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.rpc('verify_certificate', {
        p_code: null,
        p_first_name: firstName.trim(),
        p_last_initial: lastInitial.trim().charAt(0).toUpperCase(),
        p_course_id: selectedCourse || null,
        p_year: selectedYear ? parseInt(selectedYear) : null
      });
      
      if (error) throw error;
      setResult(data as unknown as VerificationResult);
    } catch (error) {
      console.error('Verification error:', error);
      setResult({ valid: false, reason: 'verification_failed' });
    } finally {
      setIsPending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Certificate Verification
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Verify the authenticity and validity of ProCann Edu certificates. Enter a certificate
            number below to check its current status.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto space-y-8">
          {/* Privacy Notice */}
          <Alert className="bg-muted/50 border-muted">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Public Verification:</span> This service only shows certificate validity status. For full certificate details, please log in to your account.
            </AlertDescription>
          </Alert>

          {/* Verification Methods Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Verify Certificate
              </CardTitle>
              <CardDescription>
                Choose a verification method below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="code" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    By Code
                  </TabsTrigger>
                  <TabsTrigger value="name" className="flex items-center gap-2">
                    <UserSearch className="h-4 w-4" />
                    By Name
                  </TabsTrigger>
                </TabsList>

                {/* Verify by Code */}
                <TabsContent value="code" className="space-y-4">
                  <div>
                    <Input
                      placeholder="Enter certificate number (e.g., RVT-202601-A3K9QZ)"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyByCode()}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Format: PREFIX-YYYYMM-XXXXXX (e.g., RVT-202601-A3K9QZ)
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleVerifyByCode()} 
                    disabled={isPending || !code.trim()}
                    className="w-full"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Verify
                      </>
                    )}
                  </Button>
                </TabsContent>

                {/* Verify by Name */}
                <TabsContent value="name" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        First Name
                      </label>
                      <Input
                        placeholder="e.g., John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Last Initial
                      </label>
                      <Input
                        placeholder="e.g., S"
                        value={lastInitial}
                        onChange={(e) => setLastInitial(e.target.value.charAt(0).toUpperCase())}
                        maxLength={1}
                        className="uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Course (Optional)
                      </label>
                      <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any course</SelectItem>
                          {courses?.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Year (Optional)
                      </label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any year</SelectItem>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleVerifyByName} 
                    disabled={isPending || !firstName.trim() || !lastInitial.trim()}
                    className="w-full"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <UserSearch className="h-4 w-4 mr-2" />
                        Search Certificates
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Name search returns match count only. Full details require the verification code.
                  </p>
                </TabsContent>
              </Tabs>
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
                      {result.valid 
                        ? (result.method === 'name_search' ? 'Certificates Found' : 'Valid Certificate')
                        : 'Invalid or Not Found'
                      }
                    </CardTitle>
                    {result.status === 'revoked' && (
                      <Badge variant="destructive">Revoked</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {result.valid && result.method === 'code' && (
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

                    {result.expiry_date && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Expiry Date</p>
                          <p className="font-medium">{formatDate(result.expiry_date)}</p>
                        </div>
                      </div>
                    )}

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

              {result.valid && result.method === 'name_search' && (
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                      {result.match_count} Certificate{result.match_count !== 1 ? 's' : ''} Found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                  </div>
                  
                  {result.hint && (
                    <Alert>
                      <Lock className="h-4 w-4" />
                      <AlertDescription>
                        {result.hint}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              )}

              {!result.valid && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {result.reason === 'not_found' 
                      ? 'No certificate found with this verification code. Please check the code and try again.'
                      : result.reason === 'no_matches'
                      ? 'No certificates found matching this name. Please verify the spelling and try again.'
                      : 'Unable to verify this certificate. Please contact support if you believe this is an error.'}
                  </p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Privacy Footer */}
          <p className="text-xs text-muted-foreground text-center">
            Public verification confirms certificate validity only. Personal details are shown only to the certificate holder or authorized employers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
