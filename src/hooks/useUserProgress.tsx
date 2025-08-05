import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/components/ui/use-toast';

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
    onSuccess: () => {
      // Invalidate and refetch progress data
      queryClient.invalidateQueries({ queryKey: ['user-progress', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', user?.id] });
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

  const isModuleCompleted = (moduleId: string): boolean => {
    return getModuleProgress(moduleId)?.isCompleted || false;
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
    updateProgress,
    migrateFromLocalStorage,
    isUpdating: updateProgressMutation.isPending
  };
};

export default useUserProgress;