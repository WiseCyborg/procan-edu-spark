import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type JourneyStage = 
  | 'new_user' 
  | 'profile_incomplete' 
  | 'onboarding_in_progress' 
  | 'onboarding_complete'
  | 'course_in_progress'
  | 'course_complete'
  | 'certified'
  | 'renewal_due';

export type WizardType = 'manager_onboarding' | 'profile_setup' | 'course_module' | null;

interface JourneyState {
  id?: string;
  user_id: string;
  current_stage: JourneyStage;
  current_wizard: WizardType;
  current_step: number;
  wizard_metadata: Record<string, any>;
  last_page_visited: string | null;
  last_action: string | null;
  last_activity_at: string;
  stage_entered_at: string;
  welcome_message_shown: boolean;
  resume_prompt_count: number;
  last_resume_prompt_at: string | null;
}

export const useJourneyState = () => {
  const { user } = useAuth();
  const [journeyState, setJourneyState] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create journey state
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchJourneyState = async () => {
      try {
        let { data, error } = await supabase
          .from('user_journey_state')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('[useJourneyState] Error fetching:', error);
          setLoading(false);
          return;
        }

        // Create if doesn't exist
        if (!data) {
          const { data: newData, error: insertError } = await supabase
            .from('user_journey_state')
            .upsert({
              user_id: user.id,
              current_stage: 'new_user',
              current_wizard: null,
              current_step: 1,
              wizard_metadata: {},
              last_activity_at: new Date().toISOString(),
              stage_entered_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .select()
            .single();

          if (insertError) {
            console.error('[useJourneyState] Error creating:', insertError);
          } else {
            setJourneyState(newData as JourneyState);
          }
        } else {
          setJourneyState(data as JourneyState);
        }
      } catch (err) {
        console.error('[useJourneyState] Exception:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJourneyState();
  }, [user]);

  // Update journey state
  const updateJourneyState = useCallback(async (updates: Partial<JourneyState>) => {
    if (!user || !journeyState) return;

    try {
      const { data, error } = await supabase
        .from('user_journey_state')
        .update({
          ...updates,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[useJourneyState] Error updating:', error);
      } else {
        setJourneyState(data as JourneyState);
      }
    } catch (err) {
      console.error('[useJourneyState] Exception updating:', err);
    }
  }, [user, journeyState]);

  // Update current step in wizard
  const updateStep = useCallback((step: number) => {
    updateJourneyState({ current_step: step });
  }, [updateJourneyState]);

  // Update stage
  const updateStage = useCallback((stage: JourneyStage, wizard?: WizardType) => {
    updateJourneyState({
      current_stage: stage,
      current_wizard: wizard || null,
      current_step: 1,
      stage_entered_at: new Date().toISOString(),
    });
  }, [updateJourneyState]);

  // Start a wizard
  const startWizard = useCallback((wizard: WizardType, step: number = 1) => {
    updateJourneyState({
      current_wizard: wizard,
      current_step: step,
      current_stage: wizard === 'manager_onboarding' ? 'onboarding_in_progress' : journeyState?.current_stage || 'new_user',
    });
  }, [updateJourneyState, journeyState]);

  // Complete a wizard
  const completeWizard = useCallback(() => {
    const newStage = journeyState?.current_wizard === 'manager_onboarding' 
      ? 'onboarding_complete' 
      : journeyState?.current_stage || 'new_user';

    updateJourneyState({
      current_wizard: null,
      current_step: 1,
      current_stage: newStage,
    });
  }, [updateJourneyState, journeyState]);

  // Track page visit
  const trackPageVisit = useCallback((page: string) => {
    updateJourneyState({ last_page_visited: page });
  }, [updateJourneyState]);

  // Track action
  const trackAction = useCallback((action: string) => {
    updateJourneyState({ last_action: action });
  }, [updateJourneyState]);

  // Mark welcome message as shown
  const markWelcomeShown = useCallback(() => {
    updateJourneyState({ welcome_message_shown: true });
  }, [updateJourneyState]);

  // Increment resume prompt count
  const incrementResumePrompt = useCallback(() => {
    updateJourneyState({
      resume_prompt_count: (journeyState?.resume_prompt_count || 0) + 1,
      last_resume_prompt_at: new Date().toISOString(),
    });
  }, [updateJourneyState, journeyState]);

  // Get resume message
  const getResumeMessage = useCallback(() => {
    if (!journeyState) return null;

    const { current_stage, current_wizard, current_step } = journeyState;

    if (current_wizard === 'manager_onboarding' && current_step > 1) {
      const stepNames = ['Welcome', 'Organization Profile', 'Training Seats', 'Invite Employees'];
      return {
        title: 'Welcome back!',
        message: `You were on Step ${current_step} of 4: ${stepNames[current_step - 1]}`,
        action: 'Continue Setup',
        route: '/onboarding/wizard',
      };
    }

    if (current_stage === 'onboarding_in_progress') {
      return {
        title: 'Setup In Progress',
        message: 'Complete your organization setup to unlock all features',
        action: 'Continue Onboarding',
        route: '/onboarding/wizard',
      };
    }

    if (current_stage === 'course_in_progress') {
      return {
        title: 'Training In Progress',
        message: 'Continue where you left off in your training',
        action: 'Resume Training',
        route: '/dashboard',
      };
    }

    return null;
  }, [journeyState]);

  return {
    journeyState,
    loading,
    updateStep,
    updateStage,
    startWizard,
    completeWizard,
    trackPageVisit,
    trackAction,
    markWelcomeShown,
    incrementResumePrompt,
    getResumeMessage,
  };
};
