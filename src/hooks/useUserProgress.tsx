import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/components/ui/use-toast';
import { useTierProgress } from './useTierProgress';
import { useUserRole } from './useUserRole';

export interface UserProgress {
  id: string;
  user_id: string;
  course_id: string;
  module_id?: string;
  is_completed: boolean;
  score?: number;
  time_spent: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleProgress {
  moduleId: string;
  isCompleted: boolean;
  score?: number;
  timeSpent: number;
}

export const useUserProgress = (courseId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { checkAndUnlockTier } = useTierProgress();
  const { isDispensaryManager, isTrainingCoordinator, isAdmin } = useUserRole();
  
  // Role-based module requirements
  const isManagerRole = isDispensaryManager || isTrainingCoordinator || isAdmin;

  // Fetch user progress for a specific course
  const {
    data: progressData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['user-progress', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      let query = supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);
      
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user?.id,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      isCompleted,
      score,
      timeSpent
    }: {
      courseId: string;
      moduleId: string;
      isCompleted: boolean;
      score?: number;
      timeSpent: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if progress record exists
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('module_id', moduleId)
        .single();

      if (existingProgress) {
        // Update existing progress
        const { data, error } = await supabase
          .from('user_progress')
          .update({
            is_completed: isCompleted,
            score,
            time_spent: timeSpent,
            completed_at: isCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new progress record
        const { data, error } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            course_id: courseId,
            module_id: moduleId,
            is_completed: isCompleted,
            score,
            time_spent: timeSpent,
            completed_at: isCompleted ? new Date().toISOString() : null
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch progress data
      queryClient.invalidateQueries({ queryKey: ['user-progress', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', user?.id] });
      
      // Check for tier unlock after completing a module
      if (variables.isCompleted) {
        const completedCount = (progressData?.filter(p => p.is_completed).length || 0) + 1;
        const totalModules = 23; // Total modules in course
        const completionPercentage = Math.round((completedCount / totalModules) * 100);
        
        // Update learning journey state
        try {
          await supabase
            .from('user_learning_journey')
            .update({
              modules_completed: completedCount,
              completion_percentage: completionPercentage,
              current_stage: completionPercentage >= 100 ? 'course_completed' : 'course_in_progress',
              last_activity_at: new Date().toISOString(),
              stage_entered_at: completionPercentage === Math.round((1 / totalModules) * 100) 
                ? new Date().toISOString() 
                : undefined
            })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Failed to update learning journey:', error);
        }
        
        // Attempt to unlock tier
        const tierUnlocked = await checkAndUnlockTier(completedCount);
        
        if (tierUnlocked) {
          console.log('New tier unlocked at', completedCount, 'modules');
        }
        
        // Show tier completion celebrations
        // RVT certification uses modules 0-18 only
        if (completedCount === 6 && !localStorage.getItem('green_tier_celebrated')) {
          toast({
            title: '🟢 Green Tier Complete!',
            description: "You've mastered the fundamentals. Yellow Tier unlocked!",
          });
          localStorage.setItem('green_tier_celebrated', 'true');
        } else if (completedCount === 12 && !localStorage.getItem('yellow_tier_celebrated')) {
          toast({
            title: '🟡 Yellow Tier Complete!',
            description: "Advanced protocols mastered. Red Tier unlocked!",
          });
          localStorage.setItem('yellow_tier_celebrated', 'true');
        } else if (completedCount === 19 && !localStorage.getItem('rvt_complete_celebrated')) {
          // RVT Complete at 19 modules (0-18)
          toast({
            title: '🎓 RVT Training Complete!',
            description: "All RVT modules mastered! Ready for certification exam!",
          });
          localStorage.setItem('rvt_complete_celebrated', 'true');
        } else if (completedCount === 24 && !localStorage.getItem('manager_track_celebrated')) {
          // Full completion including Manager Track
          toast({
            title: '👔 Manager Track Complete!',
            description: "Leadership training complete! Manager certification available!",
          });
          localStorage.setItem('manager_track_celebrated', 'true');
        }
      }
    },
    onError: (error) => {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Module UUID mapping - maps module numbers to database UUIDs
  const MODULE_UUID_MAP: Record<number, string> = {
    0: 'f543fad9-fb96-485c-9ca0-980564acc559',
    1: 'f31492ad-f497-463f-9e30-9333ff42a54e',
    2: '3b7d23c0-c7d9-48ea-ac75-17e515e6304a',
    3: '949aee25-1254-4dfe-a22b-e17912670ba7',
    4: '14d0aa9f-4436-460c-a76b-52f07ba33bf3',
    5: '00daed9a-9d63-4b21-ae90-7444816cb783',
    6: '9b4ccbb6-e96a-4d7e-9862-d33082cf35dc',
    7: 'b610259f-7bd4-4f77-9350-7c2c29939432',
    8: 'dbacc5bc-e14c-470a-a0ba-852df2b41220',
    9: 'b49e8150-f795-4d6f-a501-35d5e1f5aacf',
    10: '7c10652a-202b-459a-b02c-9020906b1888',
    11: 'f2eaecb3-603b-4f9e-90ea-254f57774b8f',
    12: 'f39ac55c-6ee4-4a49-a739-8a0bb6869fc8',
    13: '3f0bad34-49ef-4ed7-8ade-6785dd35719a',
    14: 'b8d16c7f-10e6-40d5-b766-721839038f5e',
    15: 'd1c88334-3ef4-488b-8d9e-cda14d8199f8',
    16: '8c8cc197-94c8-4633-88e2-dc1e73566079',
    17: 'f0b3a393-7486-4f20-8bab-83711606105e',
    18: '0365fffa-3111-400b-bcea-54eacd3f13ef',
    19: 'ec62fe97-9a99-4cec-b25c-7ecbedebbd55',
    20: '63d100f8-ad66-4c21-a743-b01df46b94df',
    21: '0afce5e1-eff1-41c2-b7a6-3a67511c43dc',
    22: '4c8c78c9-6080-40c3-98c0-9930389f771a',
    23: 'bdbbc605-a8f8-4a65-ba9a-a2451198174c',
  };

  // Track separation: RVT (0-18) vs Manager (19-23)
  const RVT_REQUIRED_MAX = 18;
  const RVT_MODULE_COUNT = 19; // Modules 0-18 (required for RVT Certificate)
  const MANAGER_MODULE_COUNT = 5; // Modules 19-23 (optional Manager Track)
  const TOTAL_ALL_MODULES = 24; // Total modules in course
  
  // For RVT certification, only modules 0-18 are required
  // Manager modules are optional and don't block RVT certification
  const TOTAL_MODULES = RVT_MODULE_COUNT;
  const REQUIRED_FOR_EXAM = RVT_MODULE_COUNT; // RVT exam requires only RVT modules

  // Helper functions
  const getModuleProgress = (moduleId: string): ModuleProgress | null => {
    if (!progressData) return null;
    
    const moduleProgress = progressData.find(p => p.module_id === moduleId);
    if (!moduleProgress) return null;

    return {
      moduleId,
      isCompleted: moduleProgress.is_completed,
      score: moduleProgress.score,
      timeSpent: moduleProgress.time_spent
    };
  };

  const getCompletedModulesCount = (): number => {
    if (!progressData) return 0;
    return progressData.filter(p => p.is_completed && p.module_id).length;
  };

  const getTotalScore = (): number => {
    if (!progressData) return 0;
    const completedModules = progressData.filter(p => p.is_completed && p.score);
    if (completedModules.length === 0) return 0;
    
    const totalScore = completedModules.reduce((sum, p) => sum + (p.score || 0), 0);
    return Math.round(totalScore / completedModules.length);
  };

  // Check if module is completed by UUID
  const isModuleCompleted = (moduleId: string): boolean => {
    return getModuleProgress(moduleId)?.isCompleted || false;
  };

  // Check if module is completed by module number (0-23)
  const isModuleCompletedByNumber = (moduleNumber: number): boolean => {
    const uuid = MODULE_UUID_MAP[moduleNumber];
    if (!uuid) return false;
    return isModuleCompleted(uuid);
  };

  // Get module UUID from number
  const getModuleUUID = (moduleNumber: number): string | undefined => {
    return MODULE_UUID_MAP[moduleNumber];
  };

  // Check if user can access a module (prerequisite check)
  const canAccessModule = (moduleNumber: number): boolean => {
    // Module 0 is always accessible
    if (moduleNumber === 0) return true;
    
    // All previous modules must be completed
    for (let i = 0; i < moduleNumber; i++) {
      if (!isModuleCompletedByNumber(i)) {
        return false;
      }
    }
    return true;
  };

  // Check if all RVT required modules are completed (for RVT exam/certificate)
  // Only modules 0-18 are required for RVT certification
  const areAllModulesCompleted = (): boolean => {
    for (let i = 0; i <= RVT_REQUIRED_MAX; i++) {
      if (!isModuleCompletedByNumber(i)) {
        return false;
      }
    }
    return true;
  };

  // Check if all Manager Track modules are completed (for Manager certificate)
  const areAllManagerModulesCompleted = (): boolean => {
    for (let i = RVT_REQUIRED_MAX + 1; i <= 23; i++) {
      if (!isModuleCompletedByNumber(i)) {
        return false;
      }
    }
    return true;
  };

  // Get RVT completed count (modules 0-18 only)
  const getRvtCompletedCount = (): number => {
    let count = 0;
    for (let i = 0; i <= RVT_REQUIRED_MAX; i++) {
      if (isModuleCompletedByNumber(i)) {
        count++;
      }
    }
    return count;
  };

  // Get Manager Track completed count (modules 19-23)
  const getManagerCompletedCount = (): number => {
    let count = 0;
    for (let i = RVT_REQUIRED_MAX + 1; i <= 23; i++) {
      if (isModuleCompletedByNumber(i)) {
        count++;
      }
    }
    return count;
  };

  // Get first incomplete module number (within RVT required modules)
  const getFirstIncompleteModule = (): number => {
    for (let i = 0; i <= RVT_REQUIRED_MAX; i++) {
      if (!isModuleCompletedByNumber(i)) {
        return i;
      }
    }
    return RVT_REQUIRED_MAX + 1; // All RVT modules complete, return first manager module
  };

  const updateProgress = async (
    courseId: string,
    moduleId: string,
    isCompleted: boolean,
    score?: number,
    timeSpent: number = 0
  ) => {
    return updateProgressMutation.mutateAsync({
      courseId,
      moduleId,
      isCompleted,
      score,
      timeSpent
    });
  };

  // Convert localStorage data to Supabase (migration helper)
  const migrateFromLocalStorage = async (courseId: string) => {
    try {
      const savedProgress = localStorage.getItem('courseProgress');
      const savedScores = localStorage.getItem('moduleScores');
      
      if (savedProgress || savedScores) {
        const completedModules = savedProgress ? JSON.parse(savedProgress) : [];
        const moduleScores = savedScores ? JSON.parse(savedScores) : {};
        
        // Migrate completed modules
        for (const moduleId of completedModules) {
          const score = moduleScores[moduleId];
          await updateProgress(courseId, moduleId, true, score);
        }
        
        // Clear localStorage after successful migration
        localStorage.removeItem('courseProgress');
        localStorage.removeItem('moduleScores');
        
        toast({
          title: "Progress Synced",
          description: "Your local progress has been synced to your account.",
        });
      }
    } catch (error) {
      console.error('Error migrating localStorage data:', error);
    }
  };

  return {
    progressData,
    isLoading,
    error,
    getModuleProgress,
    getCompletedModulesCount,
    getTotalScore,
    isModuleCompleted,
    isModuleCompletedByNumber,
    getModuleUUID,
    canAccessModule,
    areAllModulesCompleted,
    areAllManagerModulesCompleted,
    getRvtCompletedCount,
    getManagerCompletedCount,
    getFirstIncompleteModule,
    updateProgress,
    migrateFromLocalStorage,
    isUpdating: updateProgressMutation.isPending,
    TOTAL_MODULES,
    RVT_MODULE_COUNT,
    MANAGER_MODULE_COUNT,
    RVT_REQUIRED_MAX,
    REQUIRED_FOR_EXAM,
    isManagerRole,
  };
};

export default useUserProgress;