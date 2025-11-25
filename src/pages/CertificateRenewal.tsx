import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Award, Clock, AlertTriangle, CheckCircle, BookOpen, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Certificate {
  id: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  is_revoked: boolean;
  tier_badge: string | null;
}

const CertificateRenewal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const certId = searchParams.get('cert');
  
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [renewalOption, setRenewalOption] = useState<'quiz' | 'course' | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCertificate();
  }, [user]);

  const fetchCertificate = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('issue_date', { ascending: false });

      if (certId) {
        query = query.eq('id', certId);
      }

      const { data, error } = await query.limit(1).single();

      if (error) throw error;
      setCertificate(data);
    } catch (error) {
      console.error('Error fetching certificate:', error);
      toast.error('Failed to load certificate details');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (daysRemaining: number) => {
    if (daysRemaining < 0) return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' };
    if (daysRemaining <= 30) return { status: 'critical', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' };
    if (daysRemaining <= 90) return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' };
    return { status: 'valid', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
  };

  const handleRenewalOption = (option: 'quiz' | 'course') => {
    setRenewalOption(option);
    
    if (option === 'course') {
      toast.info('Redirecting to training course...');
      setTimeout(() => navigate('/course'), 1000);
    } else {
      toast.info('Quick recertification quiz coming soon!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No certificate found. Please complete the training course first.</p>
            <div className="mt-4 text-center">
              <Button onClick={() => navigate('/course')}>Start Training</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = calculateDaysUntilExpiry(certificate.expiry_date);
  const expiryStatus = getExpiryStatus(daysRemaining);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Certificate Renewal</h1>
        <p className="text-muted-foreground mt-1">Keep your certification current and compliant</p>
      </div>

      {/* Certificate Status Card */}
      <Card className={expiryStatus.bgColor}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className={`h-8 w-8 ${expiryStatus.color}`} />
              <div>
                <CardTitle>Maryland RVT Certificate</CardTitle>
                <CardDescription className="mt-1">
                  Certificate #{certificate.certificate_number}
                </CardDescription>
              </div>
            </div>
            {certificate.tier_badge && (
              <Badge variant="outline" className="text-lg px-3 py-1">
                {certificate.tier_badge}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Issued</p>
              <p className="font-semibold">{new Date(certificate.issue_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expires</p>
              <p className="font-semibold">{new Date(certificate.expiry_date).toLocaleDateString()}</p>
            </div>
          </div>

          <Separator />

          {/* Expiry Status Alert */}
          {daysRemaining < 0 ? (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-800 font-semibold">
                Your certificate has expired. Renew immediately to maintain compliance.
              </AlertDescription>
            </Alert>
          ) : daysRemaining <= 30 ? (
            <Alert className="border-orange-200 bg-orange-50">
              <Clock className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <span className="font-semibold">Urgent: </span>
                Your certificate expires in {daysRemaining} days.
              </AlertDescription>
            </Alert>
          ) : daysRemaining <= 90 ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-5 w-5 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Your certificate expires in {daysRemaining} days. Consider renewing soon.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-800">
                Your certificate is valid for {daysRemaining} more days.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Renewal Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Recertification Quiz */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleRenewalOption('quiz')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Quick Recertification</CardTitle>
                <CardDescription>30-question abbreviated exam</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>30 minutes estimated time</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>80% passing score required</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Instant certificate upon passing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>$49 renewal fee</span>
              </li>
            </ul>
            <Button className="w-full" disabled={renewalOption === 'quiz'}>
              {renewalOption === 'quiz' ? 'Coming Soon' : 'Start Quiz'}
            </Button>
          </CardContent>
        </Card>

        {/* Full Course Refresh */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleRenewalOption('course')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Full Course Refresh</CardTitle>
                <CardDescription>Complete retraining with all modules</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>All 18 training modules</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Updated regulatory content</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Full final exam</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Free with active seat</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full">
              Start Full Course
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Why Renew Your Certificate?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Maryland law requires all cannabis dispensary agents to maintain current RVT certification. 
            Renewing your certificate ensures:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground ml-4 list-disc">
            <li>Compliance with COMAR regulations</li>
            <li>Knowledge of the latest industry guidelines</li>
            <li>Continued employment eligibility</li>
            <li>Professional development and best practices</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CertificateRenewal;
