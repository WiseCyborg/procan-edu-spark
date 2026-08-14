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

// ---------------------------------------------------------------------------
// Module-scope write guards.
// These deliberately live OUTSIDE the hook so that every hook instance (and
// every remount) shares the same de-duplication state. Per-instance refs were
// reset on remount, which allowed a runaway PATCH loop against
// user_journey_state.
// ---------------------------------------------------------------------------
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

const BREAKER_WINDOW_MS = 60_000;
const BREAKER_MAX_WRITES = 20;
// Minimum time between two writes that touch the same field signature.
// Protects against A→B→A oscillation between two components, which would
// otherwise defeat the "same payload" guard below.
const MIN_SIGNATURE_INTERVAL_MS = 10_000;

let writeTimestamps: number[] = [];
let breakerTripped = false;
const inFlightPayload = new Map<string, string>();
const lastWrittenPayload = new Map<string, string>();
const lastSignatureAt = new Map<string, number>();


export const useJourneyState = () => {
  const { user } = useAuth();
  const [journeyState, setJourneyState] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep a ref to the latest state so callbacks can stay referentially stable
  const journeyStateRef = useRef<JourneyState | null>(null);

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

  // Update journey state (stable identity — reads latest state from a ref)
  const updateJourneyState = useCallback(async (updates: Partial<JourneyState>) => {
    const current = journeyStateRef.current;
    if (!userId || !current) return;

    const now = Date.now();

    // Guard 0: hard stop for the session after a runaway write loop.
    if (breakerTripped) return;

    // Guard 1: only write fields that actually DIFFER from the stored row.
    // last_activity_at is never a reason to write on its own.
    const changed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (!MEANINGFUL_FIELDS.includes(k as keyof JourneyState)) continue;
      const currentValue = (current as unknown as Record<string, unknown>)[k];
      const isEqual =
        typeof v === 'object' && v !== null
          ? JSON.stringify(currentValue) === JSON.stringify(v)
          : currentValue === v;
      if (!isEqual) changed[k] = v;
    }
    if (Object.keys(changed).length === 0) return;

    // Guard 2: never issue the same payload twice for this user (in flight or
    // already written). Cleared automatically when the values change again.
    const payloadKey = `${userId}:${JSON.stringify(changed)}`;
    if (lastWrittenPayload.get(userId) === payloadKey) return;
    if (inFlightPayload.get(userId) === payloadKey) return;

    // Guard 3: cap total writes per rolling window, across all hook instances
    // and remounts (module-scope state).
    writeTimestamps = writeTimestamps.filter((t) => now - t < BREAKER_WINDOW_MS);
    if (writeTimestamps.length >= BREAKER_MAX_WRITES) {
      breakerTripped = true;
      console.warn(
        '[useJourneyState] Write circuit breaker tripped (>20 writes/60s). Journey-state writes disabled for this session.'
      );
      return;
    }
    writeTimestamps.push(now);
    inFlightPayload.set(userId, payloadKey);
    lastWrittenPayload.set(userId, payloadKey);

    try {
      const { data, error } = await supabase
        .from('user_journey_state')
        .update({
          ...changed,
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
      inFlightPayload.delete(userId);
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
  }, [stage, wizard, step]);

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
