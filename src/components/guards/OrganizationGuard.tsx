import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Building2, Loader2 } from 'lucide-react';

interface OrganizationGuardProps {
  children: ReactNode;
  fallbackPath?: string;
  showMessage?: boolean;
}

export const OrganizationGuard = ({ 
  children, 
  fallbackPath = '/dashboard',
  showMessage = true 
}: OrganizationGuardProps) => {
  const navigate = useNavigate();
  const { flags, isLoading: flagsLoading } = useFeatureFlags();
  const { organizationId, organization, isLoading: orgLoading } = useOrganization();

  if (!flags.org_nav_guard) {
    return <>{children}</>;
  }

  if (flagsLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organizationId || !organization) {
    if (!showMessage) {
      navigate(fallbackPath, { replace: true });
      return null;
    }

    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <div>
                <CardTitle>Organization Required</CardTitle>
                <CardDescription>
                  This feature requires you to be part of an organization.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                <strong>Students:</strong> Join your dispensary's team using the join code provided by your manager.
              </p>
              <p className="text-sm text-orange-800 mt-2">
                <strong>Managers:</strong> Complete your organization setup or contact support for assistance.
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                <Building2 className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button onClick={() => navigate('/faq')}>
                Get Help
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
