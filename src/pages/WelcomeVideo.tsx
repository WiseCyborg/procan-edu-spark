import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Play } from 'lucide-react';
import { toast } from 'sonner';

const WelcomeVideo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasWatched, setHasWatched] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  // Check if user has already watched
  useEffect(() => {
    const checkWatchStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Type cast since column was just added
      if ((data as any)?.welcome_video_watched) {
        setHasWatched(true);
      }
    };
    
    checkWatchStatus();
  }, [user]);

  const markAsWatched = async () => {
    if (!user) return;
    
    setIsMarking(true);
    try {
      // Type cast since column was just added
      const { error } = await supabase
        .from('profiles')
        .update({ welcome_video_watched: true } as any)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setHasWatched(true);
      toast.success('Welcome video completed!');
    } catch (error) {
      console.error('Error marking video as watched:', error);
      toast.error('Could not save progress');
    } finally {
      setIsMarking(false);
    }
  };

  const handleContinue = () => {
    navigate('/course');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to ProCann Edu
            </h1>
            <p className="text-muted-foreground">
              Watch this short introduction to get started with your RVT training
            </p>
          </div>

          {/* Video Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                RVT Training Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Video Embed - Using Vimeo for best iOS Safari compatibility */}
              <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden mb-6">
                <iframe
                  src="https://player.vimeo.com/video/1050355764?badge=0&autopause=0&player_id=0&app_id=58479"
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  allowFullScreen
                  title="ProCann Edu Welcome Video"
                />
              </div>

              {/* Video Description */}
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">What you'll learn:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Overview of Maryland's cannabis training requirements</li>
                    <li>• How to navigate the ProCann Edu platform</li>
                    <li>• Course structure and certification process</li>
                    <li>• Tips for successful completion</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {!hasWatched ? (
                    <Button 
                      onClick={markAsWatched}
                      disabled={isMarking}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isMarking ? 'Saving...' : 'Mark as Watched'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 px-4 py-2 bg-green-50 dark:bg-green-950 rounded-lg flex-1 justify-center">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Completed</span>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleContinue}
                    variant={hasWatched ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    Continue to Course
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/profile')}
              className="h-auto py-4"
            >
              <div className="text-left">
                <div className="font-semibold">Complete Profile</div>
                <div className="text-xs text-muted-foreground">Update your information</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/student-dashboard')}
              className="h-auto py-4"
            >
              <div className="text-left">
                <div className="font-semibold">Back to Dashboard</div>
                <div className="text-xs text-muted-foreground">View your progress</div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeVideo;
