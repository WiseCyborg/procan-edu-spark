import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, User } from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

interface ProfileCompletionBannerProps {
  showOnlyIfIncomplete?: boolean;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  showOnlyIfIncomplete = true
}) => {
  const navigate = useNavigate();
  const { 
    completionPercentage, 
    missingFields, 
    isProfileComplete, 
    isLoading 
  } = useProfileCompletion();

  if (isLoading) {
    return null;
  }

  if (showOnlyIfIncomplete && isProfileComplete()) {
    return null;
  }

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <span className="font-medium text-orange-800">
              Profile {completionPercentage}% Complete
            </span>
            <Progress 
              value={completionPercentage} 
              className="flex-1 max-w-xs h-2"
            />
          </div>
          <p className="text-sm text-orange-700">
            Complete your profile to access all course features. 
            Missing: {missingFields.slice(0, 3).join(', ')}
            {missingFields.length > 3 && ` and ${missingFields.length - 3} more`}
          </p>
        </div>
        <Button 
          onClick={() => navigate('/profile')}
          size="sm"
          className="ml-4 bg-orange-600 hover:bg-orange-700 text-white"
        >
          <User className="h-4 w-4 mr-1" />
          Complete Profile
        </Button>
      </AlertDescription>
    </Alert>
  );
};