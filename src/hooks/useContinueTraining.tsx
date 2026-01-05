import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProgress } from './useUserProgress';
import { useUserRole } from './useUserRole';

export type TrainingPath = 'rvt' | 'manager' | 'public';
export type TrainingStatus = 'not_started' | 'in_progress' | 'rvt_complete' | 'manager_complete' | 'all_complete';

interface ContinueTrainingResult {
  // Navigation
  continueTraining: () => void;
  continueUrl: string;
  
  // Status
  status: TrainingStatus;
  currentPath: TrainingPath;
  
  // Progress
  rvtProgress: { completed: number; total: number; percentage: number };
  managerProgress: { completed: number; total: number; percentage: number };
  
  // Labels
  ctaLabel: string;
  ctaDescription: string;
  
  // Next step info
  nextModuleNumber: number | null;
  nextModuleTitle: string | null;
  estimatedMinutes: number | null;
  
  // State flags
  isLoading: boolean;
  isRvtComplete: boolean;
  isManagerComplete: boolean;
  canTakeExam: boolean;
}

// Module titles for display (could be fetched from DB but hardcoded for performance)
const MODULE_TITLES: Record<number, string> = {
  0: 'Welcome & Course Overview',
  1: 'Maryland Cannabis History & Legal Framework',
  2: 'COMAR Regulations Overview',
  3: 'Licensing & Regulatory Compliance',
  4: 'Product Knowledge Fundamentals',
  5: 'Cannabinoids & Terpenes',
  6: 'Consumption Methods',
  7: 'Dosing & Patient Guidance',
  8: 'Medical Cannabis Conditions',
  9: 'ID Verification & Age Compliance',
  10: 'Transaction Limits & Purchase Tracking',
  11: 'METRC Seed-to-Sale Tracking',
  12: 'Inventory Management',
  13: 'Waste Disposal & Diversion Prevention',
  14: 'Security Protocols',
  15: 'Customer Service Excellence',
  16: 'Handling Difficult Situations',
  17: 'Health & Safety Compliance',
  18: 'Final Review & Exam Preparation',
  19: 'Leadership Fundamentals',
  20: 'Team Management & Scheduling',
  21: 'Compliance Auditing',
  22: 'Incident Management',
  23: 'Strategic Planning',
};

const ESTIMATED_MINUTES: Record<number, number> = {
  0: 5, 1: 15, 2: 20, 3: 15, 4: 15, 5: 20, 6: 15, 7: 20, 8: 15, 9: 10,
  10: 15, 11: 25, 12: 15, 13: 15, 14: 20, 15: 15, 16: 15, 17: 15, 18: 20,
  19: 20, 20: 20, 21: 25, 22: 20, 23: 25,
};

export const useContinueTraining = (): ContinueTrainingResult => {
  const navigate = useNavigate();
  const { isLoading: progressLoading, getRvtCompletedCount, getManagerCompletedCount, getFirstIncompleteModule, areAllModulesCompleted, areAllManagerModulesCompleted, RVT_MODULE_COUNT, MANAGER_MODULE_COUNT, RVT_REQUIRED_MAX } = useUserProgress();
  const { isDispensaryManager, isTrainingCoordinator, isAdmin } = useUserRole();
  
  const isManagerRole = isDispensaryManager || isTrainingCoordinator || isAdmin;
  
  const result = useMemo(() => {
    const rvtCompleted = getRvtCompletedCount();
    const managerCompleted = getManagerCompletedCount();
    const isRvtComplete = areAllModulesCompleted();
    const isManagerComplete = areAllManagerModulesCompleted();
    const firstIncomplete = getFirstIncompleteModule();
    
    // Calculate progress
    const rvtProgress = {
      completed: rvtCompleted,
      total: RVT_MODULE_COUNT,
      percentage: Math.round((rvtCompleted / RVT_MODULE_COUNT) * 100),
    };
    
    const managerProgress = {
      completed: managerCompleted,
      total: MANAGER_MODULE_COUNT,
      percentage: Math.round((managerCompleted / MANAGER_MODULE_COUNT) * 100),
    };
    
    // Determine status
    let status: TrainingStatus = 'not_started';
    if (rvtCompleted === 0) {
      status = 'not_started';
    } else if (!isRvtComplete) {
      status = 'in_progress';
    } else if (isRvtComplete && !isManagerComplete) {
      status = 'rvt_complete';
    } else if (isRvtComplete && isManagerComplete) {
      status = 'all_complete';
    }
    
    // Determine current path
    let currentPath: TrainingPath = 'rvt';
    if (isRvtComplete && !isManagerComplete && isManagerRole) {
      currentPath = 'manager';
    }
    
    // Determine next step
    let nextModuleNumber: number | null = null;
    let continueUrl = '/course';
    let ctaLabel = 'Start Training';
    let ctaDescription = 'Begin your RVT certification journey';
    
    if (status === 'not_started') {
      nextModuleNumber = 0;
      continueUrl = '/course/0';
      ctaLabel = 'Start Training';
      ctaDescription = 'Begin your RVT certification journey';
    } else if (status === 'in_progress') {
      nextModuleNumber = firstIncomplete;
      continueUrl = `/course/${firstIncomplete}`;
      ctaLabel = 'Continue Training';
      ctaDescription = `Module ${firstIncomplete} of ${RVT_REQUIRED_MAX} • ${ESTIMATED_MINUTES[firstIncomplete] || 15} min`;
    } else if (status === 'rvt_complete') {
      // RVT complete - show exam or manager track
      continueUrl = '/rvt-complete';
      ctaLabel = 'Take RVT Exam';
      ctaDescription = 'All RVT modules complete! Ready for certification';
      
      if (isManagerRole && managerCompleted < MANAGER_MODULE_COUNT) {
        nextModuleNumber = RVT_REQUIRED_MAX + 1 + managerCompleted;
        if (nextModuleNumber <= 23) {
          continueUrl = `/course/${nextModuleNumber}`;
          ctaLabel = 'Continue Manager Track';
          ctaDescription = `Manager Module ${managerCompleted + 1} of ${MANAGER_MODULE_COUNT}`;
        }
      }
    } else if (status === 'all_complete') {
      continueUrl = '/certificates';
      ctaLabel = 'View Certificates';
      ctaDescription = 'All training complete!';
    }
    
    const nextModuleTitle = nextModuleNumber !== null ? MODULE_TITLES[nextModuleNumber] || null : null;
    const estimatedMinutes = nextModuleNumber !== null ? ESTIMATED_MINUTES[nextModuleNumber] || null : null;
    
    return {
      status,
      currentPath,
      rvtProgress,
      managerProgress,
      continueUrl,
      ctaLabel,
      ctaDescription,
      nextModuleNumber,
      nextModuleTitle,
      estimatedMinutes,
      isRvtComplete,
      isManagerComplete,
      canTakeExam: isRvtComplete,
    };
  }, [getRvtCompletedCount, getManagerCompletedCount, getFirstIncompleteModule, areAllModulesCompleted, areAllManagerModulesCompleted, RVT_MODULE_COUNT, MANAGER_MODULE_COUNT, RVT_REQUIRED_MAX, isManagerRole]);
  
  const continueTraining = () => {
    navigate(result.continueUrl);
  };
  
  return {
    ...result,
    continueTraining,
    isLoading: progressLoading,
  };
};

export default useContinueTraining;
