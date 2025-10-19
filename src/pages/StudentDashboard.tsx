import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useTierProgress } from '@/hooks/useTierProgress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DeadlineCountdown } from '@/components/course/DeadlineCountdown';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, BookOpen, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';
const TOTAL_MODULES = 18;

const StudentDashboard = () => {
  const { user } = useAuth();
  const { isStudent } = useUserRole();
  const { completionPercentage, isProfileComplete } = useProfileCompletion();
  const { getCompletedModulesCount, getTotalScore, isLoading: progressLoading } = useUserProgress(COURSE_ID);
  const { currentTier, getNextTier, getModulesNeededForNextTier } = useTierProgress();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [organizationInfo, setOrganizationInfo] = useState<{name: string, coordinator: string} | null>(null);

  useEffect(() => {
    if (!progressLoading) {
      fetchOrganizationInfo();
    }
  }, [progressLoading, user]);

  const fetchOrganizationInfo = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, organizations(name)')
        .eq('user_id', user.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationInfo({
          name: (profile.organizations as any)?.name || 'Your Organization',
          coordinator: 'Training Coordinator'
        });
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isStudent) {
    return null;
  }

  if (isLoading || progressLoading) {
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

  const completedModules = getCompletedModulesCount();
  const averageScore = getTotalScore();
  const nextTier = getNextTier();
  const modulesForNextTier = getModulesNeededForNextTier();
  const nextModuleNumber = completedModules + 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <ProfileCompletionBanner />

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

      <div>
        <h1 className="text-3xl font-bold text-foreground">My Training Dashboard</h1>
        <p className="text-muted-foreground">Track your progress and achievements</p>
      </div>

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
              <Badge 
                variant="outline" 
                className={`text-lg ${
                  currentTier === 'red' ? 'border-red-500 text-red-700' :
                  currentTier === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                  'border-green-500 text-green-700'
                }`}
              >
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Tier
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {nextTier && modulesForNextTier
                ? `Complete ${modulesForNextTier} more modules to unlock ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} Tier`
                : 'All tiers unlocked!'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedModules} / {TOTAL_MODULES}</div>
            <Progress value={(completedModules / TOTAL_MODULES) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              {averageScore >= 90 ? 'Excellent work!' : averageScore >= 80 ? 'Keep up the great work!' : 'Keep studying!'}
            </p>
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
          {completedModules < TOTAL_MODULES ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/50">
              <div>
                <h3 className="font-semibold">
                  {nextModuleNumber <= 6 ? 'Green Tier' : nextModuleNumber <= 12 ? 'Yellow Tier' : 'Red Tier'} - 
                  Module {nextModuleNumber}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {nextModuleNumber === 1 && 'Welcome & Course Orientation'}
                  {nextModuleNumber === 2 && 'Legal and Regulatory Foundations'}
                  {nextModuleNumber === 3 && 'Operational and Safety Procedures'}
                  {nextModuleNumber === 4 && 'Cannabis Products & Forms'}
                  {nextModuleNumber === 5 && 'Customer Service Excellence'}
                  {nextModuleNumber === 6 && 'Inventory Management & Security'}
                  {nextModuleNumber === 7 && 'Cannabis Pharmacology and Therapeutics'}
                  {nextModuleNumber === 8 && 'Medical Cannabis Fundamentals'}
                  {nextModuleNumber === 9 && 'Dosing & Product Selection'}
                  {nextModuleNumber === 10 && 'Effects & Adverse Reactions'}
                  {nextModuleNumber === 11 && 'Record Keeping & Documentation'}
                  {nextModuleNumber === 12 && 'Quality Assurance & Testing'}
                  {nextModuleNumber === 13 && 'Packaging & Labeling Compliance'}
                  {nextModuleNumber === 14 && 'Compliance Inspections & Audits'}
                  {nextModuleNumber === 15 && 'Emergency Procedures & Incident Response'}
                  {nextModuleNumber === 16 && 'Substance Use and Customer Safety'}
                  {nextModuleNumber === 17 && 'Ethics & Professional Conduct'}
                  {nextModuleNumber === 18 && 'Responsible Vendor Training Program'}
                </p>
              </div>
              <Button onClick={() => navigate('/course')}>Continue</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-300">All Modules Complete!</h3>
                <p className="text-sm text-green-600 dark:text-green-400">Ready to take the final exam</p>
              </div>
              <Button onClick={() => navigate('/final-exam')} className="bg-green-600 hover:bg-green-700">
                Start Final Exam
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements - Only show if there are any */}
      {completedModules > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>Your learning milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentTier === 'green' && completedModules >= 6 && (
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Green Tier Unlocked</p>
                    <p className="text-sm text-muted-foreground">Completed first 6 modules</p>
                  </div>
                </div>
              )}
              {currentTier === 'yellow' && completedModules >= 12 && (
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Award className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">Yellow Tier Unlocked</p>
                    <p className="text-sm text-muted-foreground">Completed 12 modules</p>
                  </div>
                </div>
              )}
              {currentTier === 'red' && completedModules >= 18 && (
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Award className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Red Tier Unlocked</p>
                    <p className="text-sm text-muted-foreground">Completed all modules!</p>
                  </div>
                </div>
              )}
              {averageScore >= 95 && (
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Excellence Award</p>
                    <p className="text-sm text-muted-foreground">95%+ average score</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organization Info */}
      {organizationInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Training Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Organization:</span>
              <span className="text-sm font-medium">{organizationInfo.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Training Coordinator:</span>
              <span className="text-sm font-medium">{organizationInfo.coordinator}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Support:</span>
              <Button variant="link" className="text-sm h-auto p-0">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
