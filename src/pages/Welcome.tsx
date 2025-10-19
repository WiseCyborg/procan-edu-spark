
import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, BookOpen, Award } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const Welcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const sendWelcomeEmail = async () => {
      if (!user) return;

      try {
        const userMetadata = user.user_metadata || {};
        const firstName = userMetadata.first_name || '';
        const lastName = userMetadata.last_name || '';

        await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: user.email,
            firstName,
            lastName,
          },
        });

        console.log('Welcome email sent successfully');
      } catch (error) {
        console.error('Error sending welcome email:', error);
      }
    };

    sendWelcomeEmail();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader className="text-center bg-green-600 text-white">
              <CardTitle className="text-3xl mb-2">
                🎉 Welcome to ProCann Edu!
              </CardTitle>
              <p className="text-green-100">
                Your journey to cannabis certification starts here
              </p>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Hello {user?.user_metadata?.first_name}!
                </h2>
                <p className="text-gray-600 text-lg mb-4">
                  Thank you for joining Maryland's leading cannabis training platform. 
                  You're now ready to begin your certification journey.
                </p>
                <p className="text-sm text-gray-500">
                  Aligned to MCA Responsible Vendor Training standards under COMAR 14.17
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Account Created</h3>
                  <p className="text-sm text-gray-600">Your account is set up and ready</p>
                </div>
                <div className="text-center">
                  <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Course Access</h3>
                  <p className="text-sm text-gray-600">18 modules now available</p>
                </div>
                <div className="text-center">
                  <Award className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Certification Ready</h3>
                  <p className="text-sm text-gray-600">Earn your official certificate</p>
                </div>
              </div>

              <Card className="bg-gray-50 mb-8">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">What's Next?</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</div>
                      <div>
                        <p className="font-medium">Complete Your Profile</p>
                        <p className="text-sm text-gray-600">Add any additional information to your profile</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</div>
                      <div>
                        <p className="font-medium">Start the RVT Course</p>
                        <p className="text-sm text-gray-600">Begin with Module 1 of the Maryland Responsible Vendor Training</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</div>
                      <div>
                        <p className="font-medium">Take the Final Exam</p>
                        <p className="text-sm text-gray-600">Complete all modules and pass the certification exam</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 mr-4"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={() => navigate('/course')}
                  size="lg"
                  variant="outline"
                >
                  Start Course
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Course Overview: Maryland RVT</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-green-700 mb-3">Course Structure</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• 18 comprehensive modules</li>
                    <li>• Self-paced learning</li>
                    <li>• Interactive quizzes</li>
                    <li>• Final certification exam</li>
                    <li>• Immediate certificate upon passing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-green-700 mb-3">Key Topics Covered</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Maryland cannabis regulations</li>
                    <li>• Patient safety and compliance</li>
                    <li>• Inventory management</li>
                    <li>• Security requirements</li>
                    <li>• Quality control standards</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
