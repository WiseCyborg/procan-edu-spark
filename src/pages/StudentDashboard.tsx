import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DeadlineCountdown } from '@/components/course/DeadlineCountdown';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, BookOpen, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { isStudent } = useUserRole();
  const { completionPercentage, isProfileComplete } = useProfileCompletion();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!isStudent) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Profile Completion Banner */}
      <ProfileCompletionBanner />

      {/* Profile Completion Card (if incomplete) */}
      {!isProfileComplete() && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Action Required: Complete Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {completionPercentage}% complete - Finish your profile to access all course features
            </p>
            <Button 
              onClick={() => navigate('/profile')} 
              className="bg-orange-600 hover:bg-orange-700"
            >
              Complete Profile Now ({100 - completionPercentage}% remaining)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Training Dashboard</h1>
        <p className="text-muted-foreground">Track your progress and achievements</p>
      </div>

      {/* Deadline Countdown */}
      <DeadlineCountdown />

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Tier</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg">
                Green Tier
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Complete 6 modules to unlock Yellow Tier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 / 18</div>
            <Progress value={(3 / 18) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground mt-2">Keep up the great work!</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Module */}
      <Card>
        <CardHeader>
          <CardTitle>Continue Learning</CardTitle>
          <CardDescription>Pick up where you left off</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/50">
            <div>
              <h3 className="font-semibold">Module 4: Cannabis Products & Forms</h3>
              <p className="text-sm text-muted-foreground">Green Tier • 15 minutes remaining</p>
            </div>
            <Button onClick={() => navigate('/course')}>Continue</Button>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
          <CardDescription>Your learning milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Green Tier Unlocked</p>
                <p className="text-sm text-muted-foreground">Completed first 3 modules</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Perfect Score</p>
                <p className="text-sm text-muted-foreground">100% on Module 2 quiz</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>Training Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Organization:</span>
            <span className="text-sm font-medium">Green Leaf Dispensary</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Training Coordinator:</span>
            <span className="text-sm font-medium">Sarah Johnson</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Support:</span>
            <Button variant="link" className="text-sm h-auto p-0">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
