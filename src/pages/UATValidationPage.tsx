import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUATMode } from '@/hooks/useUATMode';
import { UATValidationChecklist } from '@/components/uat/UATValidationChecklist';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const UATValidationPage: React.FC = () => {
  const { isUATUser, isLoading } = useUATMode();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Only allow UAT users to access this page
  if (!isUATUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              This validation checklist is only available to UAT testers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <UATValidationChecklist />
    </div>
  );
};

export default UATValidationPage;
