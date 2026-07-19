import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Clock, CheckCircle, Award, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useJourneyState } from '@/hooks/useJourneyState';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  name: string;
  logo_url?: string;
}

export const WelcomeModal = () => {
  const { user } = useAuth();
  const { journeyState, markWelcomeShown } = useJourneyState();
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    const checkAndShowWelcome = async () => {
      if (!user || !journeyState) return;

      // Show welcome if:
      // 1. User has never seen welcome (welcome_message_shown is false)
      // 2. User is a new employee (stage is 'new_user' or 'profile_incomplete')
      const shouldShow = 
        !journeyState.welcome_message_shown && 
        (journeyState.current_stage === 'new_user' || journeyState.current_stage === 'profile_incomplete');

      if (shouldShow) {
        // Fetch organization info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('organization_id, organizations(name)')
          .eq('user_id', user.id)
          .single();

        if (profileData?.organization_id) {
          setOrganization({
            name: (profileData.organizations as any)?.name || 'Your Organization'
          });
        }

        setOpen(true);
      }
    };

    checkAndShowWelcome();
  }, [user, journeyState]);

  const handleGetStarted = () => {
    markWelcomeShown();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Award className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">
            Welcome to ProCann Edu! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {organization && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{organization.name}</span>
              </div>
            )}
            You're about to begin your Maryland Responsible Vendor Training certification journey.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Training Overview */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              What to Expect
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">19</Badge>
                  <span className="text-sm font-medium">Modules</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comprehensive training covering all Maryland cannabis regulations
                </p>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">~4 Hours</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Complete at your own pace, progress is automatically saved
                </p>
              </div>

              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Certificate</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Receive your official RVT certificate after passing the final exam
                </p>
              </div>
            </div>
          </div>

          {/* Getting Started Checklist */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Your Journey</h3>
            <div className="space-y-2">
              {[
                { step: 1, text: 'Complete your profile', subtext: 'Add your name, photo, and contact info' },
                { step: 2, text: 'Watch the welcome video', subtext: 'Quick introduction to the platform' },
                { step: 3, text: 'Complete all 19 required modules', subtext: 'Learn everything about Maryland cannabis regulations' },
                { step: 4, text: 'Pass the final exam', subtext: '80% score required for certification' },
                { step: 5, text: 'Download your certificate', subtext: 'Official Maryland RVT certificate' }
              ].map(({ step, text, subtext }) => (
                <div key={step} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
                    {step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{text}</p>
                    <p className="text-xs text-muted-foreground">{subtext}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <Button className="flex-1" size="lg" onClick={handleGetStarted}>
              Let's Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
