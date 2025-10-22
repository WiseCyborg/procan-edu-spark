import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, User, Shield, Briefcase } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfilePhotoUpload } from '@/components/profile/ProfilePhotoUpload';
import { 
  formatPhoneNumber, 
  formatZipCode, 
  validateDateOfBirth, 
  sanitizeProfileData 
} from '@/utils/validation-helpers';

export const ProfileOnboardingWizard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('MD');
  const [zipCode, setZipCode] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [mcaRegistrationNumber, setMcaRegistrationNumber] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const canProceed = () => {
    if (currentStep === 1) {
      return firstName && lastName && phone && dateOfBirth;
    }
    if (currentStep === 2) {
      return address && city && state && zipCode && emergencyContactName && emergencyContactPhone;
    }
    return true; // Step 3 is optional
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    setter(formatPhoneNumber(e.target.value));
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZipCode(formatZipCode(e.target.value));
  };

  const saveProgress = async (isComplete: boolean = false) => {
    // Critical validation: Check user session
    if (!user?.id) {
      toast({
        title: "Session Expired",
        description: "Please log in again to save your profile",
        variant: "destructive"
      });
      navigate('/auth');
      return false;
    }

    setSaving(true);
    try {
      const profileData = sanitizeProfileData({
        first_name: firstName,
        last_name: lastName,
        phone,
        date_of_birth: dateOfBirth,
        address,
        city,
        state,
        zip_code: zipCode,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        job_title: jobTitle,
        mca_registration_number: mcaRegistrationNumber,
        profile_photo_url: profilePhotoUrl,
        onboarding_completed: isComplete
      });

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          ...profileData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      // Log successful save
      await supabase.from('user_operation_logs').insert({
        user_id: user?.id,
        operation_type: 'profile_onboarding',
        success: true,
        operation_data: { step: currentStep, completed: isComplete }
      });

      return true;
    } catch (error: any) {
      console.error('Error saving profile:', error);
      
      // Log failed save
      await supabase.from('user_operation_logs').insert({
        user_id: user?.id,
        operation_type: 'profile_onboarding',
        success: false,
        error_code: error.code,
        error_message: error.message
      });

      toast({
        title: "Save Failed",
        description: error.message || "Failed to save profile data",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (!canProceed()) return;

    // Validate date of birth on step 1
    if (currentStep === 1) {
      const dobValidation = validateDateOfBirth(dateOfBirth);
      if (!dobValidation.valid) {
        toast({
          title: "Invalid Date of Birth",
          description: dobValidation.error,
          variant: "destructive"
        });
        return;
      }
    }

    const saved = await saveProgress(false);
    if (saved && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    const saved = await saveProgress(true);
    if (saved) {
      toast({
        title: "Profile Complete!",
        description: "Welcome to ProCann Edu. Let's get started with your training.",
      });
      navigate('/dashboard');
    }
  };

  const handleSkip = async () => {
    toast({
      title: "Step Skipped",
      description: "You can complete your profile anytime from your dashboard.",
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
              <CardDescription>Step {currentStep} of {totalSteps}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">{progress.toFixed(0)}% Complete</div>
              <Progress value={progress} className="w-32" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Essential Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Essential Information</h3>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  We need this information to issue your certificate and comply with Maryland cannabis regulations.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e, setPhone)}
                  placeholder="(555) 123-4567"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For exam verification and certificate delivery
                </p>
              </div>

              <div>
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be 18+ to work in Maryland cannabis industry
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Safety & Emergency Contact */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Safety & Emergency Contact</h3>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Emergency contact information is required for workplace safety compliance.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Baltimore"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="MD"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={zipCode}
                  onChange={handleZipChange}
                  placeholder="21201"
                  required
                />
              </div>

              <hr className="my-4" />

              <div>
                <Label htmlFor="emergencyName">Emergency Contact Name *</Label>
                <Input
                  id="emergencyName"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="emergencyPhone">Emergency Contact Phone *</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => handlePhoneChange(e, setEmergencyContactPhone)}
                  placeholder="(555) 987-6543"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 3: Professional Information (Optional) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Professional Information</h3>
                <span className="text-sm text-muted-foreground">(Optional)</span>
              </div>

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  You can skip this step and complete it later from your profile settings.
                </AlertDescription>
              </Alert>

              <div className="flex justify-center py-4">
                <ProfilePhotoUpload
                  userId={user?.id || ''}
                  currentPhotoUrl={profilePhotoUrl}
                  onPhotoUpdate={setProfilePhotoUrl}
                />
              </div>

              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Budtender, Manager, etc."
                />
              </div>

              <div>
                <Label htmlFor="mcaNumber">MCA Registration Number</Label>
                <Input
                  id="mcaNumber"
                  value={mcaRegistrationNumber}
                  onChange={(e) => setMcaRegistrationNumber(e.target.value)}
                  placeholder="MCA-XXXX-XXXX"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If you already have a Maryland Cannabis Administration registration
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || saving}
            >
              Back
            </Button>

            <div className="flex gap-2">
              {currentStep === 3 && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={saving}
                >
                  Skip for Now
                </Button>
              )}

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || saving}
                >
                  {saving ? 'Saving...' : 'Next'}
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saving ? 'Completing...' : 'Complete & Start Training'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
