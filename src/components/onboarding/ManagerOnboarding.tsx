import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { ArrowLeft, X } from 'lucide-react';
import { 
  WelcomeStep, 
  OrganizationSnapshotStep, 
  SeatOverviewStep, 
  InviteEmployeesStep 
} from './ManagerOnboardingSteps';

interface ManagerOnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

interface Organization {
  id: string;
  name: string;
  address: string | null;
  contact_phone: string | null;
  license_number: string | null;
}

export const ManagerOnboarding = ({ onComplete, onSkip }: ManagerOnboardingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [inviteEmails, setInviteEmails] = useState('');

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  // Fetch organization data
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!organizationId) return;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, address, contact_phone, license_number')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Failed to fetch organization:', error);
      } else {
        setOrganization(data);
      }
    };

    fetchOrganization();
  }, [organizationId]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);

    // Parse and send employee invitations
    const emails = inviteEmails
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      toast({
        title: "Onboarding Complete",
        description: "You can invite employees later from your dashboard.",
      });
      onComplete?.();
      return;
    }

    if (!user?.id || !organizationId) {
      toast({
        title: "Error",
        description: "Missing user or organization information",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'invite_bulk',
          organizationId,
          inviterId: user.id,
          emails,
          role: 'student'
        }
      });

      if (error) {
        console.error("Bulk invitation error:", error);
        toast({
          title: "Invitation Error",
          description: "Some invitations may have failed. Check Team Management for details.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invitations Sent!",
          description: `Successfully sent ${emails.length} invitation(s).`,
        });
      }

      onComplete?.();
    } catch (error) {
      console.error("Exception during bulk invitation:", error);
      toast({
        title: "Unexpected Error",
        description: "Failed to send invitations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Welcome';
      case 2: return 'Organization Profile';
      case 3: return 'Training Seats';
      case 4: return 'Invite Employees';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-700 mb-2">
            Manager Onboarding
          </h1>
          <p className="text-muted-foreground">
            Let's get your organization set up for success
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}: {getStepTitle()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Skip Setup
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Main Card */}
        <Card>
          {/* Step Content */}
          {currentStep === 1 && (
            <WelcomeStep
              organizationId={organizationId}
              organizationName={organization?.name || 'Your Organization'}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && organization && (
            <OrganizationSnapshotStep
              organizationId={organizationId}
              organizationName={organization.name}
              onNext={handleNext}
            />
          )}

          {currentStep === 3 && (
            <SeatOverviewStep
              organizationId={organizationId}
              organizationName={organization?.name || ''}
              onNext={handleNext}
            />
          )}

          {currentStep === 4 && (
            <InviteEmployeesStep
              organizationId={organizationId}
              organizationName={organization?.name || ''}
              inviteEmails={inviteEmails}
              setInviteEmails={setInviteEmails}
              onNext={handleNext}
              onFinish={handleFinish}
              isLoading={loading}
            />
          )}

          {/* Navigation */}
          {currentStep > 1 && currentStep < totalSteps && (
            <div className="px-6 pb-6">
              <Button
                variant="outline"
                onClick={handleBack}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          )}
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Need help? Contact{' '}
          <a href="mailto:support@procannedu.com" className="text-primary hover:underline">
            support@procannedu.com
          </a>
        </div>
      </div>
    </div>
  );
};
