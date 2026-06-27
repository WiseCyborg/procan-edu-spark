import { useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type EventType = 'play' | 'pause' | 'seek' | 'progress' | 'ended' | 'error';

interface EmitOptions {
  position?: number;
  duration?: number;
  rate?: number;
  seekFrom?: number;
  seekTo?: number;
}

const PROGRESS_THROTTLE_MS = 15_000;
const PROGRESS_MILESTONE_STEP = 10; // percent

/**
 * Reusable analytics hook for HTML5 <video> playback tracking.
 * Writes rows into `video_engagement_events`. All inserts are silent
 * on failure — they must never block or surface errors to learners.
 */
export function useVideoEngagementTracking(
  assetKey: string | null | undefined,
  isSupplement: boolean,
  moduleId: string | null | undefined,
  courseId: string | null | undefined,
) {
  const { user } = useAuth();
  const sessionId = useMemo(() => {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    // New sitting per hook mount (page-load / module open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetKey, isSupplement, moduleId]);

  const lastProgressEmitRef = useRef<number>(0);
  const lastMilestoneRef = useRef<number>(-1);
  const lastSeekFromRef = useRef<number | null>(null);

  const emit = useCallback(
    async (eventType: EventType, opts: EmitOptions = {}) => {
      try {
        if (!user?.id || !assetKey || !moduleId || !courseId) return;
        const duration = Number.isFinite(opts.duration) ? (opts.duration as number) : 0;
        const position = Number.isFinite(opts.position) ? (opts.position as number) : 0;
        if (!duration || Number.isNaN(duration)) return;
        const percent = Math.max(0, Math.min(100, (position / duration) * 100));

        const payload: Record<string, unknown> = {
          user_id: user.id,
          course_id: courseId,
          module_id: moduleId,
          asset_key: assetKey,
          is_supplement: isSupplement,
          session_id: sessionId,
          event_type: eventType,
          position_seconds: position,
          duration_seconds: duration,
          percent_watched: percent,
          playback_rate: opts.rate ?? 1,
          client_event_at: new Date().toISOString(),
        };
        if (eventType === 'seek') {
          payload.seek_from_seconds = opts.seekFrom ?? null;
          payload.seek_to_seconds = opts.seekTo ?? position;
        }

        const { error } = await supabase.from('video_engagement_events').insert(payload as any);
        if (error) console.error('[video-engagement] insert failed', error);
      } catch (err) {
        console.error('[video-engagement] emit threw', err);
      }
    },
    [user?.id, assetKey, moduleId, courseId, isSupplement, sessionId],
  );

  const onPlay = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      emit('play', { position: v.currentTime, duration: v.duration, rate: v.playbackRate });
    },
    [emit],
  );

  const onPause = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      // Ignore the pause that fires right at ended
      if (v.ended) return;
      emit('pause', { position: v.currentTime, duration: v.duration, rate: v.playbackRate });
    },
    [emit],
  );

  const onSeeking = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    lastSeekFromRef.current = e.currentTarget.currentTime;
  }, []);

  const onSeeked = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      emit('seek', {
        position: v.currentTime,
        duration: v.duration,
        rate: v.playbackRate,
        seekFrom: lastSeekFromRef.current ?? undefined,
        seekTo: v.currentTime,
      });
      lastSeekFromRef.current = null;
    },
    [emit],
  );

  const onTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      if (!v.duration || Number.isNaN(v.duration)) return;
      const now = Date.now();
      const percent = (v.currentTime / v.duration) * 100;
      const milestone = Math.floor(percent / PROGRESS_MILESTONE_STEP);
      const crossedMilestone =
        milestone > lastMilestoneRef.current && milestone > 0 && milestone < 10; // skip 100 (ended handles it)
      const throttledOk = now - lastProgressEmitRef.current >= PROGRESS_THROTTLE_MS;
      if (!crossedMilestone && !throttledOk) return;
      lastProgressEmitRef.current = now;
      lastMilestoneRef.current = milestone;
      emit('progress', { position: v.currentTime, duration: v.duration, rate: v.playbackRate });
    },
    [emit],
  );

  const onEnded = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      emit('ended', { position: v.currentTime, duration: v.duration, rate: v.playbackRate });
    },
    [emit],
  );

  const onError = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const v = e.currentTarget;
      emit('error', { position: v.currentTime || 0, duration: v.duration || 0, rate: v.playbackRate });
    },
    [emit],
  );

  /** Imperative emitters for non-DOM players (e.g. Vimeo iframe / SCORM wrapper). */
  const emitManual = useCallback(
    (eventType: EventType, opts: EmitOptions = {}) => emit(eventType, opts),
    [emit],
  );

  return { onPlay, onPause, onSeeking, onSeeked, onTimeUpdate, onEnded, onError, emitManual };
}
