import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Keep a ref to the latest state so callbacks can stay referentially stable
  const journeyStateRef = useRef<JourneyState | null>(null);
  const inFlightPayloadRef = useRef<string | null>(null);
  useEffect(() => {
    journeyStateRef.current = journeyState;
  }, [journeyState]);

  const userId = user?.id;

  // Fetch or create journey state
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchJourneyState = async () => {
      try {
        let { data, error } = await supabase
          .from('user_journey_state')
          .select('*')
          .eq('user_id', userId)
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
              user_id: userId,
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
  }, [userId]);

  // Fields whose change is a *real* transition worth persisting immediately.
  const MEANINGFUL_FIELDS: (keyof JourneyState)[] = [
    'current_stage',
    'current_wizard',
    'current_step',
    'last_page_visited',
    'last_action',
    'welcome_message_shown',
    'resume_prompt_count',
    'wizard_metadata',
  ];

  const HEARTBEAT_INTERVAL_MS = 60_000;
  const BREAKER_WINDOW_MS = 60_000;
  const BREAKER_MAX_WRITES = 20;

  const lastHeartbeatRef = useRef<number>(0);
  const writeTimestampsRef = useRef<number[]>([]);
  const breakerTrippedRef = useRef(false);

  // Update journey state (stable identity — reads latest state from a ref)
  const updateJourneyState = useCallback(async (updates: Partial<JourneyState>) => {
    const current = journeyStateRef.current;
    if (!userId || !current) return;

    const now = Date.now();

    // Circuit breaker 0: hard stop for the session after a runaway write loop.
    if (breakerTrippedRef.current) return;

    // Circuit breaker 1: drop writes whose payload already matches the row.
    // last_activity_at is appended below and deliberately excluded from this
    // comparison, so a "touch only last_activity_at" write is never issued.
    const isNoOp = Object.entries(updates).every(
      ([k, v]) => (current as unknown as Record<string, unknown>)[k] === v
    );

    // Heartbeat throttle: a write that changes nothing meaningful is only
    // allowed through once per HEARTBEAT_INTERVAL_MS.
    const hasMeaningfulChange = MEANINGFUL_FIELDS.some(
      (k) =>
        k in updates &&
        (current as unknown as Record<string, unknown>)[k] !==
          (updates as unknown as Record<string, unknown>)[k]
    );
    if (!hasMeaningfulChange) {
      if (isNoOp) return;
      if (now - lastHeartbeatRef.current < HEARTBEAT_INTERVAL_MS) return;
    }

    // Circuit breaker 2: never issue the same payload twice concurrently.
    // Distinct payloads are still allowed through, so no real update is lost.
    const payloadKey = JSON.stringify(updates);
    if (inFlightPayloadRef.current === payloadKey) return;

    // Circuit breaker 3: cap total writes per rolling window.
    writeTimestampsRef.current = writeTimestampsRef.current.filter(
      (t) => now - t < BREAKER_WINDOW_MS
    );
    if (writeTimestampsRef.current.length >= BREAKER_MAX_WRITES) {
      breakerTrippedRef.current = true;
      console.warn(
        '[useJourneyState] Write circuit breaker tripped (>20 writes/60s). Journey-state writes disabled for this session.'
      );
      return;
    }
    writeTimestampsRef.current.push(now);
    lastHeartbeatRef.current = now;
    inFlightPayloadRef.current = payloadKey;

    try {
      const { data, error } = await supabase
        .from('user_journey_state')
        .update({
          ...updates,
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[useJourneyState] Error updating:', error);
      } else {
        setJourneyState(data as JourneyState);
      }
    } catch (err) {
      console.error('[useJourneyState] Exception updating:', err);
    } finally {
      inFlightPayloadRef.current = null;
    }
  }, [userId]);


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
      current_stage: wizard === 'manager_onboarding' ? 'onboarding_in_progress' : journeyStateRef.current?.current_stage || 'new_user',
    });
  }, [updateJourneyState]);

  // Complete a wizard
  const completeWizard = useCallback(() => {
    const newStage = journeyStateRef.current?.current_wizard === 'manager_onboarding' 
      ? 'onboarding_complete' 
      : journeyStateRef.current?.current_stage || 'new_user';

    updateJourneyState({
      current_wizard: null,
      current_step: 1,
      current_stage: newStage,
    });
  }, [updateJourneyState]);

  // Track page visit
  const trackPageVisit = useCallback((page: string) => {
    if (journeyStateRef.current?.last_page_visited === page) return;
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
      resume_prompt_count: (journeyStateRef.current?.resume_prompt_count || 0) + 1,
      last_resume_prompt_at: new Date().toISOString(),
    });
  }, [updateJourneyState]);

  // Get resume message (depends only on primitives so its identity is stable
  // across heartbeat-only state refreshes)
  const stage = journeyState?.current_stage ?? null;
  const wizard = journeyState?.current_wizard ?? null;
  const step = journeyState?.current_step ?? 1;
  const getResumeMessage = useCallback(() => {
    if (!stage) return null;

    const current_stage = stage;
    const current_wizard = wizard;
    const current_step = step;


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
