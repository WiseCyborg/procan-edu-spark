import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2, Users, Mail, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface ManagerOnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export const ManagerOnboarding = ({ onComplete, onSkip }: ManagerOnboardingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [isCoordinator, setIsCoordinator] = useState<string>('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [employeeEmails, setEmployeeEmails] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleCoordinatorSetup = async () => {
    if (!user?.id || !organizationId) {
      toast({
        title: "Error",
        description: "Missing user or organization information",
        variant: "destructive"
      });
      return false;
    }

    if (isCoordinator === 'yes') {
      // Create coordinator role for current user
      try {
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'training_coordinator'
          });

        if (error && !error.message.includes('duplicate')) {
          console.error('Failed to assign coordinator role:', error);
          toast({
            title: "Warning",
            description: "Could not assign coordinator role. Please contact support.",
          });
        }
      } catch (error) {
        console.error('Coordinator setup error:', error);
      }
    } else if (coordinatorEmail) {
      // Send coordinator invitation
      try {
        const { error } = await supabase.functions.invoke('staff-invitation-manager', {
          body: {
            action: 'invite_single',
            organizationId,
            inviterId: user.id,
            email: coordinatorEmail,
            role: 'training_coordinator',
            customMessage: customMessage || undefined
          }
        });

        if (error) {
          console.error("Coordinator invitation error:", error);
          toast({
            title: "Invitation Failed",
            description: "Failed to send coordinator invitation. You can invite them later from Team Management.",
          });
          return false;
        }

        toast({
          title: "Coordinator Invited",
          description: `Invitation sent to ${coordinatorEmail}`,
        });
      } catch (error) {
        console.error("Coordinator invitation exception:", error);
        return false;
      }
    }

    return true;
  };

  const handleEmployeeInvitations = async () => {
    const emails = employeeEmails
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      return true; // No emails to send, skip
    }

    if (!user?.id || !organizationId) {
      toast({
        title: "Error",
        description: "Missing user or organization information",
        variant: "destructive"
      });
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('staff-invitation-manager', {
        body: {
          action: 'invite_bulk',
          organizationId,
          inviterId: user.id,
          emails,
          role: 'student',
          customMessage: customMessage || undefined
        }
      });

      if (error) {
        console.error("Employee invitation error:", error);
        toast({
          title: "Invitation Failed",
          description: "Some invitations failed. You can retry from Team Management.",
        });
        return false;
      }

      toast({
        title: "Invitations Sent!",
        description: `Successfully invited ${data.invitations_sent || emails.length} employees`,
      });

      return true;
    } catch (error) {
      console.error("Employee invitation exception:", error);
      toast({
        title: "Error",
        description: "Failed to send invitations. You can retry from Team Management.",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!isCoordinator) {
        toast({
          title: "Selection Required",
          description: "Please select whether you'll be the coordinator",
          variant: "destructive"
        });
        return;
      }

      if (isCoordinator === 'no' && !coordinatorEmail) {
        toast({
          title: "Email Required",
          description: "Please enter the coordinator's email",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);
      const success = await handleCoordinatorSetup();
      setLoading(false);

      if (success) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    const success = await handleEmployeeInvitations();
    setLoading(false);

    if (success || employeeEmails.trim() === '') {
      toast({
        title: "Setup Complete! 🎉",
        description: "Your team is ready to get started",
      });

      if (onComplete) {
        onComplete();
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-sm">
              Step {currentStep} of {totalSteps}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>
          <Progress value={progress} className="mb-4" />
          <CardTitle className="text-2xl">Set Up Your Team</CardTitle>
          <CardDescription>
            Let's get your organization ready for training
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Coordinator Setup */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Training Coordinator</h3>
                  <p className="text-sm text-muted-foreground">
                    This person will manage employee training progress, send invitations,
                    and track completion rates.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base">Will you be the Training Coordinator?</Label>
                <RadioGroup value={isCoordinator} onValueChange={setIsCoordinator}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="yes" id="coordinator-yes" />
                    <Label htmlFor="coordinator-yes" className="cursor-pointer flex-1">
                      <div className="font-medium">Yes, I'll coordinate training</div>
                      <div className="text-sm text-muted-foreground">
                        You'll manage employee invitations and track progress
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="no" id="coordinator-no" />
                    <Label htmlFor="coordinator-no" className="cursor-pointer flex-1">
                      <div className="font-medium">No, someone else will coordinate</div>
                      <div className="text-sm text-muted-foreground">
                        We'll send them an invitation to join
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {isCoordinator === 'no' && (
                  <div className="space-y-2 pl-4 border-l-2 border-primary">
                    <Label htmlFor="coordinator-email">Coordinator's Email</Label>
                    <Input
                      id="coordinator-email"
                      type="email"
                      placeholder="coordinator@example.com"
                      value={coordinatorEmail}
                      onChange={(e) => setCoordinatorEmail(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button 
                onClick={handleNext} 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Custom Message */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-primary/10 rounded-lg">
                <Mail className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Personalize Your Invitations</h3>
                  <p className="text-sm text-muted-foreground">
                    Add a custom message that will be included in invitation emails (optional)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-message">Custom Message</Label>
                <Textarea
                  id="custom-message"
                  placeholder="e.g., Welcome to our team! We're excited to have you complete this important training..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be included in all invitation emails
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Employee Invitations */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Invite Your Employees</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter employee email addresses (one per line) to send invitations.
                    You can also do this later from Team Management.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-emails">Employee Email Addresses</Label>
                <Textarea
                  id="employee-emails"
                  placeholder="employee1@example.com&#10;employee2@example.com&#10;employee3@example.com"
                  value={employeeEmails}
                  onChange={(e) => setEmployeeEmails(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {employeeEmails.split('\n').filter(e => e.trim() && e.includes('@')).length} valid email addresses
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleFinish} 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitations...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Finish Setup
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};