import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

export type ActionType = 
  // Admin/Manager journey
  | 'apply'
  | 'await_approval'
  | 'complete_payment'
  | 'register_manager'
  | 'setup_team'
  | 'invite_employees'
  | 'purchase_seats'
  | 'monitor_progress'
  // Employee journey
  | 'enter_access_key'
  | 'await_seat'
  | 'watch_welcome'
  | 'start_training'
  | 'continue_training'
  | 'take_exam'
  | 'view_certificate'
  // Completed states
  | 'all_complete'
  | 'loading';

export interface NextAction {
  action: ActionType;
  route: string;
  title: string;
  description: string;
  buttonText: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  icon: 'alert' | 'payment' | 'setup' | 'users' | 'book' | 'exam' | 'certificate' | 'check';
}

interface JourneyState {
  // Organization state
  hasOrganization: boolean;
  organizationId: string | null;
  organizationName: string | null;
  orgApproved: boolean;
  orgPaid: boolean;
  hasJoinCode: boolean;
  joinCode: string | null;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  
  // User enrollment state
  hasSeat: boolean;
  seatStatus: string | null;
  
  // Training progress
  completedModules: number;
  totalModules: number;
  progressPercent: number;
  
  // Exam & Certificate
  hasPassedExam: boolean;
  examScore: number | null;
  hasCertificate: boolean;
  certificateNumber: string | null;
}

const DEFAULT_STATE: JourneyState = {
  hasOrganization: false,
  organizationId: null,
  organizationName: null,
  orgApproved: false,
  orgPaid: false,
  hasJoinCode: false,
  joinCode: null,
  totalSeats: 0,
  usedSeats: 0,
  availableSeats: 0,
  hasSeat: false,
  seatStatus: null,
  completedModules: 0,
  totalModules: 24,
  progressPercent: 0,
  hasPassedExam: false,
  examScore: null,
  hasCertificate: false,
  certificateNumber: null,
};

export const useNextAction = () => {
  const { user } = useAuth();
  const { roles, isAdmin, isDispensaryManager, isTrainingCoordinator, isStudent, isLoading: rolesLoading } = useUserRole();
  const [journeyState, setJourneyState] = useState<JourneyState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || rolesLoading) {
      setIsLoading(rolesLoading);
      return;
    }

    fetchJourneyState();
  }, [user, rolesLoading]);

  const fetchJourneyState = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch profile with organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      const organizationId = profile?.organization_id;

      let orgData = null;
      let joinCodeData = null;
      let seatStats = { total: 0, used: 0, available: 0 };

      if (organizationId) {
        // Fetch organization details
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, admin_approved, payment_status')
          .eq('id', organizationId)
          .single();
        orgData = org;

        // Fetch join code
        const { data: jc } = await supabase
          .from('rvt_join_codes' as any)
          .select('code')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .maybeSingle();
        joinCodeData = jc;

        // Fetch seat stats
        const { data: seats } = await supabase
          .from('rvt_seats')
          .select('status')
          .eq('organization_id', organizationId);

        if (seats) {
          seatStats.total = seats.length;
          seatStats.used = seats.filter(s => s.status === 'assigned' || s.status === 'used').length;
          seatStats.available = seats.filter(s => s.status === 'available').length;
        }
      }

      // Fetch user's seat
      const { data: userSeat } = await supabase
        .from('rvt_seats')
        .select('status')
        .eq('assigned_user_id', user.id)
        .maybeSingle();

      // Fetch course progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('module_id')
        .eq('user_id', user.id)
        .eq('is_completed', true);

      const completedModules = progressData?.length || 0;

      // Fetch exam attempts
      const { data: examAttempts } = await supabase
        .from('exam_attempts')
        .select('is_passed, total_score')
        .eq('user_id', user.id)
        .eq('is_passed', true)
        .order('created_at', { ascending: false })
        .limit(1);

      const passedExam = examAttempts && examAttempts.length > 0;
      const examScore = passedExam ? examAttempts[0].total_score : null;

      // Fetch certificates
      const { data: certs } = await supabase
        .from('certificates')
        .select('certificate_number')
        .eq('user_id', user.id)
        .eq('is_revoked', false)
        .limit(1);

      const hasCertificate = certs && certs.length > 0;

      setJourneyState({
        hasOrganization: !!organizationId,
        organizationId,
        organizationName: orgData?.name || null,
        orgApproved: orgData?.admin_approved || false,
        orgPaid: orgData?.payment_status === 'paid' || orgData?.payment_status === 'completed' || orgData?.payment_status === 'approved',
        hasJoinCode: !!(joinCodeData as any)?.code,
        joinCode: (joinCodeData as any)?.code || null,
        totalSeats: seatStats.total,
        usedSeats: seatStats.used,
        availableSeats: seatStats.available,
        hasSeat: !!userSeat,
        seatStatus: userSeat?.status || null,
        completedModules,
        totalModules: 24,
        progressPercent: Math.round((completedModules / 24) * 100),
        hasPassedExam: passedExam,
        examScore,
        hasCertificate,
        certificateNumber: certs?.[0]?.certificate_number || null,
      });
    } catch (error) {
      console.error('Error fetching journey state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute next action based on role and state
  const nextAction = useMemo((): NextAction => {
    if (isLoading) {
      return {
        action: 'loading',
        route: '',
        title: 'Loading...',
        description: 'Determining your next step',
        buttonText: 'Please wait',
        priority: 'low',
        icon: 'check'
      };
    }

    // Admin has different priorities - show admin dashboard
    if (isAdmin) {
      return {
        action: 'monitor_progress',
        route: '/admin',
        title: 'Admin Dashboard',
        description: 'Monitor system health and manage organizations',
        buttonText: 'Go to Admin',
        priority: 'low',
        icon: 'check'
      };
    }

    // MANAGER JOURNEY
    if (isDispensaryManager || isTrainingCoordinator) {
      // Step 1: No organization - need to register
      if (!journeyState.hasOrganization) {
        return {
          action: 'register_manager',
          route: '/auth?role=dispensary_manager&tab=accesskey',
          title: 'Complete Registration',
          description: 'Enter your organization access key to activate your account',
          buttonText: 'Enter Access Key',
          priority: 'critical',
          icon: 'setup'
        };
      }

      // Step 2: Org exists but no seats - need to purchase
      if (journeyState.totalSeats === 0) {
        return {
          action: 'purchase_seats',
          route: '/purchase-seats',
          title: 'Purchase Training Seats',
          description: 'Get training licenses to enable employee certification',
          buttonText: 'Purchase Seats',
          priority: 'critical',
          icon: 'payment'
        };
      }

      // Step 3: Has seats but none assigned - invite employees
      if (journeyState.usedSeats === 0) {
        return {
          action: 'invite_employees',
          route: '/team-management',
          title: 'Invite Your Team',
          description: `You have ${journeyState.availableSeats} seats available. Share your join code: ${journeyState.joinCode}`,
          buttonText: 'Manage Team',
          priority: 'high',
          icon: 'users'
        };
      }

      // Step 4: Has team - monitor progress
      return {
        action: 'monitor_progress',
        route: '/dispensary-manager-dashboard',
        title: 'Monitor Team Progress',
        description: `${journeyState.usedSeats} of ${journeyState.totalSeats} seats in use`,
        buttonText: 'View Dashboard',
        priority: 'low',
        icon: 'check'
      };
    }

    // EMPLOYEE JOURNEY (student role or default)
    // Step 1: No organization - need to enter join code
    if (!journeyState.hasOrganization && !journeyState.hasSeat) {
      return {
        action: 'enter_access_key',
        route: '/auth?role=student&tab=code',
        title: 'Enter Your Join Code',
        description: 'Ask your manager for the organization join code to start training',
        buttonText: 'Enter Join Code',
        priority: 'critical',
        icon: 'setup'
      };
    }

    // Step 2: Has org but no seat assignment
    if (!journeyState.hasSeat) {
      return {
        action: 'await_seat',
        route: '/dashboard',
        title: 'Awaiting Seat Assignment',
        description: 'Contact your manager to assign you a training seat',
        buttonText: 'Contact Manager',
        priority: 'high',
        icon: 'alert'
      };
    }

    // Step 3: Has seat, check certificate first (might be returning certified user)
    if (journeyState.hasCertificate) {
      return {
        action: 'view_certificate',
        route: '/certificates',
        title: '🎉 Certified!',
        description: `You've earned your Maryland Cannabis certification (${journeyState.certificateNumber})`,
        buttonText: 'View Certificate',
        priority: 'low',
        icon: 'certificate'
      };
    }

    // Step 4: Passed exam but no certificate yet
    if (journeyState.hasPassedExam && !journeyState.hasCertificate) {
      return {
        action: 'view_certificate',
        route: '/certificates',
        title: 'Exam Passed!',
        description: `Score: ${journeyState.examScore}%. Your certificate is being generated.`,
        buttonText: 'View Certificates',
        priority: 'medium',
        icon: 'certificate'
      };
    }

    // Step 5: Course completed - take exam
    if (journeyState.progressPercent >= 100 && !journeyState.hasPassedExam) {
      return {
        action: 'take_exam',
        route: '/course/final-exam',
        title: 'Ready for Certification Exam!',
        description: 'You\'ve completed all modules. Take the final exam to earn your certificate.',
        buttonText: 'Take Exam',
        priority: 'high',
        icon: 'exam'
      };
    }

    // Step 6: Training in progress
    if (journeyState.completedModules > 0) {
      return {
        action: 'continue_training',
        route: '/course',
        title: 'Continue Training',
        description: `${journeyState.progressPercent}% complete - ${journeyState.totalModules - journeyState.completedModules} modules remaining`,
        buttonText: 'Continue Course',
        priority: 'medium',
        icon: 'book'
      };
    }

    // Step 7: Has seat but hasn't started
    return {
      action: 'start_training',
      route: '/course',
      title: 'Start Your Training',
      description: 'Begin the Maryland Cannabis Compliance certification course',
      buttonText: 'Start Course',
      priority: 'high',
      icon: 'book'
    };
  }, [isLoading, isAdmin, isDispensaryManager, isTrainingCoordinator, journeyState, roles]);

  // Get the appropriate dashboard route for this user
  const dashboardRoute = useMemo(() => {
    if (isAdmin) return '/admin';
    if (isDispensaryManager || isTrainingCoordinator) return '/dispensary-manager-dashboard';
    return '/dashboard';
  }, [isAdmin, isDispensaryManager, isTrainingCoordinator]);

  return {
    nextAction,
    journeyState,
    isLoading,
    dashboardRoute,
    refetch: fetchJourneyState
  };
};
