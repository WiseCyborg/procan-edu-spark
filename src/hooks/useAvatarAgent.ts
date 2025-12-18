import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AvatarMessage, AvatarContext, AvatarState, AvatarPriority } from '@/types/avatarAgent';

interface UseAvatarAgentOptions {
  enabled?: boolean;
  autoPlay?: boolean;
  voice?: 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer';
}

interface UseAvatarAgentReturn {
  state: AvatarState;
  currentMessage: AvatarMessage | null;
  messageQueue: AvatarMessage[];
  triggerAvatar: (trigger: string, context: Partial<AvatarContext>) => Promise<void>;
  playMessage: (message: AvatarMessage) => Promise<void>;
  skipMessage: () => void;
  replayMessage: () => void;
  clearQueue: () => void;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export function useAvatarAgent(options: UseAvatarAgentOptions = {}): UseAvatarAgentReturn {
  const { enabled: initialEnabled = true, autoPlay = true, voice = 'nova' } = options;
  const { user } = useAuth();
  
  const [state, setState] = useState<AvatarState>('idle');
  const [isEnabled, setEnabled] = useState(initialEnabled);
  const [currentMessage, setCurrentMessage] = useState<AvatarMessage | null>(null);
  const [messageQueue, setMessageQueue] = useState<AvatarMessage[]>([]);
  const [userProfile, setUserProfile] = useState<{ first_name?: string; role?: string; organization_name?: string } | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedPromptsRef = useRef<Set<string>>(new Set());

  // Fetch user profile on mount
  useEffect(() => {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }

    const fetchProfile = async () => {
      // Get profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, organization_id')
        .eq('id', user.id)
        .single();

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      let orgName: string | undefined;
      if (profileData?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profileData.organization_id)
          .single();
        orgName = org?.name;
      }

      setUserProfile({
        first_name: profileData?.first_name || undefined,
        role: roleData?.role || 'student',
        organization_name: orgName
      });
    };

    fetchProfile();
  }, [user?.id]);

  // Build context from profile state
  const buildContext = useCallback((partialContext: Partial<AvatarContext>): AvatarContext => {
    return {
      firstName: userProfile?.first_name || undefined,
      role: (userProfile?.role as AvatarContext['role']) || 'public',
      organizationName: userProfile?.organization_name || undefined,
      currentPage: window.location.pathname,
      ...partialContext
    };
  }, [userProfile]);

  // Trigger avatar with specific prompt or trigger
  const triggerAvatar = useCallback(async (
    trigger: string,
    partialContext: Partial<AvatarContext> = {}
  ): Promise<void> => {
    if (!isEnabled) return;

    const context = buildContext(partialContext);
    
    // Prevent duplicate triggers for same prompt on same page
    const triggerKey = `${trigger}-${context.currentPage}`;
    if (playedPromptsRef.current.has(triggerKey)) {
      console.log('[Avatar] Skipping duplicate trigger:', triggerKey);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('avatar-agent', {
        body: {
          trigger,
          context,
          generateAudio: true,
          voice,
          userId: user?.id
        }
      });

      if (error) {
        console.error('[Avatar] Agent error:', error);
        return;
      }

      if (!data?.compiledText) {
        console.log('[Avatar] No matching prompt for trigger:', trigger);
        return;
      }

      const message: AvatarMessage = {
        id: crypto.randomUUID(),
        promptId: data.promptId,
        compiledText: data.compiledText,
        audioBase64: data.audioBase64,
        gazeTarget: data.gazeTarget,
        priority: data.priority as AvatarPriority,
        context,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      // Mark as played
      playedPromptsRef.current.add(triggerKey);

      // Add to queue based on priority
      setMessageQueue(prev => {
        const newQueue = [...prev, message];
        // Sort by priority
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return newQueue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      });

    } catch (err) {
      console.error('[Avatar] Trigger failed:', err);
    }
  }, [isEnabled, buildContext, voice, user?.id]);

  // Play a message
  const playMessage = useCallback(async (message: AvatarMessage): Promise<void> => {
    if (!message.audioBase64) {
      // No audio, just display text
      setCurrentMessage({ ...message, status: 'played' });
      setState('speaking');
      
      // Auto-complete after estimated reading time
      const readingTime = Math.max(3000, message.compiledText.length * 50);
      setTimeout(() => {
        setState('idle');
        setCurrentMessage(null);
      }, readingTime);
      return;
    }

    try {
      setState('speaking');
      setCurrentMessage({ ...message, status: 'delivered' });

      // Highlight gaze target
      if (message.gazeTarget) {
        const element = document.querySelector(message.gazeTarget);
        if (element) {
          element.classList.add('avatar-gaze-highlight');
        }
      }

      // Create audio from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(message.audioBase64), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onended = () => {
        setState('idle');
        setCurrentMessage(prev => prev ? { ...prev, status: 'played' } : null);
        
        // Remove gaze highlight
        if (message.gazeTarget) {
          const element = document.querySelector(message.gazeTarget);
          if (element) {
            element.classList.remove('avatar-gaze-highlight');
          }
        }
        
        // Clean up
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        
        // Clear after delay
        setTimeout(() => setCurrentMessage(null), 2000);
      };

      audioRef.current.onerror = () => {
        console.error('[Avatar] Audio playback failed');
        setState('error');
        setTimeout(() => {
          setState('idle');
          setCurrentMessage(null);
        }, 2000);
      };

      await audioRef.current.play();
      
    } catch (err) {
      console.error('[Avatar] Playback error:', err);
      setState('error');
    }
  }, []);

  // Skip current message
  const skipMessage = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    if (currentMessage?.gazeTarget) {
      const element = document.querySelector(currentMessage.gazeTarget);
      if (element) {
        element.classList.remove('avatar-gaze-highlight');
      }
    }
    
    setCurrentMessage(prev => prev ? { ...prev, status: 'skipped' } : null);
    setState('idle');
    setTimeout(() => setCurrentMessage(null), 500);
  }, [currentMessage]);

  // Replay current message
  const replayMessage = useCallback(() => {
    if (currentMessage) {
      playMessage(currentMessage);
    }
  }, [currentMessage, playMessage]);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setMessageQueue([]);
    skipMessage();
  }, [skipMessage]);

  // Auto-play queued messages
  useEffect(() => {
    if (!autoPlay || state !== 'idle' || messageQueue.length === 0) return;

    const nextMessage = messageQueue[0];
    setMessageQueue(prev => prev.slice(1));
    playMessage(nextMessage);
  }, [autoPlay, state, messageQueue, playMessage]);

  // Reset played prompts on page change
  useEffect(() => {
    const handleRouteChange = () => {
      playedPromptsRef.current.clear();
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return {
    state,
    currentMessage,
    messageQueue,
    triggerAvatar,
    playMessage,
    skipMessage,
    replayMessage,
    clearQueue,
    isEnabled,
    setEnabled
  };
}
