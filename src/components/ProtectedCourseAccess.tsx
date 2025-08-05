import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lock, User, CheckCircle } from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

interface ProtectedCourseAccessProps {
  children: React.ReactNode;
  requiresCompleteProfile?: boolean;
}

export const ProtectedCourseAccess: React.FC<ProtectedCourseAccessProps> = ({
  children,
  requiresCompleteProfile = true
}) => {
  const navigate = useNavigate();
  const { 
    completionPercentage, 
    missingFields, 
    isProfileComplete, 
    isLoading 
  } = useProfileCompletion();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requiresCompleteProfile && !isProfileComplete()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-16 w-16 text-orange-500" />
            </div>
            <CardTitle className="text-2xl text-orange-700">
              Complete Your Profile to Continue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-lg font-medium">Profile Completion</span>
                <Progress 
                  value={completionPercentage} 
                  className="flex-1 max-w-xs h-3"
                />
                <span className="text-lg font-bold text-primary">{completionPercentage}%</span>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">
                Missing Required Information:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {missingFields.map((field, index) => (
                  <div key={index} className="flex items-center text-sm text-orange-700">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                    {field}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Why Complete Your Profile?
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Access to all course modules and features</li>
                <li>• Ability to take final exams and earn certificates</li>
                <li>• Compliance with Maryland Cannabis Administration requirements</li>
                <li>• Emergency contact information for safety</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={() => navigate('/profile')}
                size="lg"
                className="bg-orange-600 hover:bg-orange-700 text-white px-8"
              >
                <User className="h-5 w-5 mr-2" />
                Complete Profile Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};