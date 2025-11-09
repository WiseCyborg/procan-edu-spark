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
import { ExamStatusCard } from '@/components/exam/ExamStatusCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, BookOpen, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';

const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';
const TOTAL_MODULES = 18;

interface ModuleData {
  module_number: number;
  title: string;
  description: string;
  estimated_minutes: number | null;
  is_manager_only: boolean | null;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const { isStudent, isDispensaryManager, isTrainingCoordinator, isAdmin } = useUserRole();
  const { completionPercentage, isProfileComplete } = useProfileCompletion();
  const { getCompletedModulesCount, getTotalScore, isLoading: progressLoading } = useUserProgress(COURSE_ID);
  const { currentTier, getNextTier, getModulesNeededForNextTier } = useTierProgress();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [organizationInfo, setOrganizationInfo] = useState<{name: string, coordinator: string} | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  
  const isManagerRole = isDispensaryManager || isTrainingCoordinator || isAdmin;
  const agentModules = modules.filter(m => !m.is_manager_only);
  const managerModules = modules.filter(m => m.is_manager_only);

  useEffect(() => {
    if (!progressLoading) {
      fetchOrganizationInfo();
    }
  }, [progressLoading, user]);

  const fetchOrganizationInfo = async () => {
    if (!user) return;
    
    try {
      const [profileResponse, modulesResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('organization_id, organizations(name)')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('course_modules')
          .select('module_number, title, description, estimated_minutes, is_manager_only')
          .eq('course_id', COURSE_ID)
          .eq('is_active', true)
          .order('module_number')
      ]);

      if (profileResponse.data?.organization_id) {
        setOrganizationInfo({
          name: (profileResponse.data.organizations as any)?.name || 'Your Organization',
          coordinator: 'Training Coordinator'
        });
      }

      if (modulesResponse.data) {
        setModules(modulesResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isStudent) {
    return null;
  }

  if (isLoading || progressLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <Skeleton className="h-12 w-full md:w-64" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
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
  const nextModule = modules.find(m => m.module_number === nextModuleNumber);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
      <ProfileCompletionBanner />

      {!isProfileComplete() && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-600 flex-shrink-0" />
              <span>Action Required: Complete Your Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {completionPercentage}% complete - Finish your profile to access all course features
            </p>
            <Button 
              onClick={() => navigate('/profile')} 
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 h-11 md:h-10"
            >
              Complete Profile Now ({100 - completionPercentage}% remaining)
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Training Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">Track your progress and achievements</p>
      </div>

      <DeadlineCountdown />

      {/* Tier System Disclaimer */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
            <span className="font-semibold">Progress Tiers:</span> Green, Yellow, and Red levels help you track your progress. 
            All 23 modules are required for Maryland RVT certification.
          </p>
        </CardContent>
      </Card>

      {/* Manager Track Info */}
      {isManagerRole && managerModules.length > 0 && (
        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Manager Track Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-800 dark:text-purple-300 mb-2">
              You have access to <strong>{managerModules.length} additional manager-level modules</strong> covering:
            </p>
            <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1 ml-4 list-disc">
              <li>Supervising Compliance Operations</li>
              <li>Regulatory Reporting & Oversight</li>
              <li>Team Training Coordination</li>
              <li>Incident Documentation</li>
              <li>Advanced Diversion Prevention</li>
            </ul>
            <p className="text-sm text-purple-800 dark:text-purple-300 mt-3">
              Complete these for <strong>Manager-Level RVT Certification</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-sm md:text-base font-medium">Current Tier</CardTitle>
            <Target className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`text-base md:text-lg px-3 py-1 ${
                  currentTier === 'red' ? 'border-red-500 text-red-700' :
                  currentTier === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                  'border-green-500 text-green-700'
                }`}
              >
                {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Tier
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-2">
              {nextTier && modulesForNextTier
                ? `Complete ${modulesForNextTier} more modules to unlock ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} Tier`
                : 'All tiers unlocked!'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-sm md:text-base font-medium">Modules Completed</CardTitle>
            <BookOpen className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="text-2xl md:text-3xl font-bold">{completedModules} / {agentModules.length || TOTAL_MODULES}</div>
            <Progress value={(completedModules / (agentModules.length || TOTAL_MODULES)) * 100} className="mt-2" />
            {isManagerRole && managerModules.length > 0 && (
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                +{managerModules.length} manager modules available
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-sm md:text-base font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
            <div className="text-2xl md:text-3xl font-bold">{averageScore}%</div>
            <p className="text-xs md:text-sm text-muted-foreground mt-2">
              {averageScore >= 90 ? 'Excellent work!' : averageScore >= 80 ? 'Keep up the great work!' : 'Keep studying!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Module */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Continue Learning</CardTitle>
          <CardDescription className="text-sm md:text-base">Pick up where you left off</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {completedModules < TOTAL_MODULES ? (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-accent/50 gap-4">
              <div className="flex-1 w-full md:w-auto">
                <h3 className="font-semibold text-base md:text-lg">
                  {nextModuleNumber <= 6 ? 'Green Tier' : nextModuleNumber <= 12 ? 'Yellow Tier' : 'Red Tier'} - 
                  Module {nextModuleNumber}
                </h3>
                <p className="text-sm md:text-base font-medium text-foreground mt-1">
                  {nextModule?.title || 'Loading...'}
                </p>
                {nextModule?.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2 md:line-clamp-none">
                    {nextModule.description}
                  </p>
                )}
                {nextModule?.estimated_minutes && (
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">
                    Estimated time: ~{nextModule.estimated_minutes} minutes
                  </p>
                )}
              </div>
              <Button 
                onClick={() => navigate('/course')} 
                className="w-full md:w-auto h-11 md:h-10 flex-shrink-0"
              >
                Continue
              </Button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950 gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-base md:text-lg text-green-700 dark:text-green-300">All Modules Complete!</h3>
                <p className="text-sm md:text-base text-green-600 dark:text-green-400">Ready to take the final exam</p>
              </div>
              <Button 
                onClick={() => navigate('/final-exam')} 
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 h-11 md:h-10 flex-shrink-0"
              >
                Start Final Exam
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Status Card */}
      <ExamStatusCard />

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
      
      <MobileBottomNav />
    </div>
  );
};

export default StudentDashboard;
