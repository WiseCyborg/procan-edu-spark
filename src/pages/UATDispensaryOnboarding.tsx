import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  FlaskConical,
  CheckCircle2,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { UATEnvironmentBanner } from '@/components/uat/UATEnvironmentBanner';

interface OnboardingFormData {
  organizationName: string;
  dbaName: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  licenseNumber: string;
  address: string;
  estimatedEmployees: number;
}

const UATDispensaryOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState<OnboardingFormData>({
    organizationName: '',
    dbaName: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    licenseNumber: '',
    address: '',
    estimatedEmployees: 5,
  });

  const handleInputChange = (field: keyof OnboardingFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create the organization with UAT environment
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName,
          dba_name: formData.dbaName || null,
          license_number: formData.licenseNumber || null,
          address: formData.address || null,
          environment: 'uat',
          ready_for_production: false,
          status: 'active',
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create dispensary application record for tracking
      const { error: appError } = await supabase
        .from('dispensary_applications')
        .insert({
          organization_name: formData.organizationName,
          dba_name: formData.dbaName || null,
          contact_person: formData.adminName,
          contact_email: formData.adminEmail,
          contact_phone: formData.adminPhone || null,
          license_number: formData.licenseNumber || null,
          address: formData.address || null,
          estimated_employees: formData.estimatedEmployees,
          organization_id: orgData.id,
          application_status: 'approved',
          compliance_affirmation: true,
        });

      if (appError) {
        console.error('Failed to create application record:', appError);
      }

      // Send magic link to admin email
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: formData.adminEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            organization_id: orgData.id,
            role: 'dispensary_manager',
            full_name: formData.adminName,
          },
        },
      });

      if (authError) throw authError;

      setStep('success');
      toast({
        title: 'UAT Organization Created',
        description: 'Check your email for a magic link to access your UAT environment.',
      });
    } catch (error: any) {
      console.error('UAT onboarding error:', error);
      toast({
        title: 'Onboarding Failed',
        description: error.message || 'Failed to create UAT organization. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">UAT Environment Created!</h2>
            <p className="text-muted-foreground">
              We've sent a magic link to <strong>{formData.adminEmail}</strong>. 
              Click the link to access your UAT dispensary environment.
            </p>
            <div className="pt-4 space-y-2">
              <p className="text-sm text-muted-foreground">What's next:</p>
              <ul className="text-sm text-left space-y-2 pl-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Check your email and click the magic link</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Complete the UAT task checklist</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Sign the attestation when ready for production</span>
                </li>
              </ul>
            </div>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full mt-4 gap-2"
            >
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <UATEnvironmentBanner environment="uat" />
        
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
              <FlaskConical className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">UAT Dispensary Onboarding</CardTitle>
            <CardDescription>
              Create a UAT environment to test ProCannEdu with your team before going live.
              All data created here is isolated and for testing purposes only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Details */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organization Details
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Company Name *</Label>
                    <Input
                      id="organizationName"
                      required
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange('organizationName', e.target.value)}
                      placeholder="Your Dispensary LLC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dbaName">DBA Name (Optional)</Label>
                    <Input
                      id="dbaName"
                      value={formData.dbaName}
                      onChange={(e) => handleInputChange('dbaName', e.target.value)}
                      placeholder="Trading As..."
                    />
                  </div>
                </div>
              </div>

              {/* Admin Contact */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Primary Admin Contact
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Full Name *</Label>
                    <Input
                      id="adminName"
                      required
                      value={formData.adminName}
                      onChange={(e) => handleInputChange('adminName', e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="adminEmail"
                        type="email"
                        required
                        className="pl-10"
                        value={formData.adminEmail}
                        onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                        placeholder="admin@dispensary.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">Phone (Optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="adminPhone"
                        type="tel"
                        className="pl-10"
                        value={formData.adminPhone}
                        onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedEmployees">Estimated # of Employees</Label>
                    <Input
                      id="estimatedEmployees"
                      type="number"
                      min="1"
                      value={formData.estimatedEmployees}
                      onChange={(e) => handleInputChange('estimatedEmployees', parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
              </div>

              {/* License & Location (Optional in UAT) */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  License & Location (Optional for UAT)
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      placeholder="MN-DISP-00000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="address"
                      className="pl-10 min-h-[80px]"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="123 Main St, Minneapolis, MN 55401"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t">
                <Button 
                  type="submit" 
                  className="w-full gap-2" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating UAT Environment...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-4 w-4" />
                      Create UAT Environment
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  By creating a UAT environment, you agree to use it for testing purposes only.
                  Production access requires completing the UAT checklist and signing the attestation.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UATDispensaryOnboarding;
