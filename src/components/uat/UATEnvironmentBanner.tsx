import React from 'react';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UATEnvironmentBannerProps {
  environment?: 'uat' | 'production';
}

export const UATEnvironmentBanner: React.FC<UATEnvironmentBannerProps> = ({ 
  environment = 'production' 
}) => {
  if (environment !== 'uat') {
    return null;
  }

  return (
    <Alert className="bg-amber-500/10 border-amber-500/50 mb-4">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-5 w-5 text-amber-500" />
        <AlertDescription className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>UAT ENVIRONMENT – Test Mode Active</span>
          <span className="text-xs font-normal ml-2 opacity-80">
            Data and certificates created here are for testing purposes only
          </span>
        </AlertDescription>
      </div>
    </Alert>
  );
};

export default UATEnvironmentBanner;
