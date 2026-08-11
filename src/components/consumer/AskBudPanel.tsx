import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Send, Volume2, VolumeX, Square, Loader2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Google Cloud Speech-to-Text is not yet confirmed enabled for this project.
// Flip to true only after voice-to-text has been verified end to end.
const MIC_ENABLED = false;

interface Citation {
  section: string;
  title: string;
  url: string;
}

interface NextStep {
  course_id: string;
  course_title: string;
  module_number: number;
  module_title: string;
  url: string;
}

interface GuideResponse {
  answer: string;
  citations?: Citation[];
  next_step?: NextStep | null;
  turns_remaining?: number | null;
  disabled?: boolean;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  nextStep?: NextStep | null;
}

const STARTER_CHIPS = [
  'What do I bring?',
  'What happens when I walk in?',
  'How do I talk to a budtender?',
  'What are the product types?',
  'Where can I legally use it?',
  'Do I need a medical card?',
];

const TOPIC_CHIPS: Record<string, string[]> = {
  visit: ['What do I bring?', 'What happens at check-in?', 'How long does a visit take?'],
  laws: ['Where can I legally use it?', 'How do I transport it home?', "What are my rights if I'm stopped?"],
  products: ['Flower vs edibles?', "What's a tincture?", 'What do topicals do?'],
  safety: ['How do I store it safely?', 'How long do effects last?', 'What if I take too much?'],
};

type OrbState = 'idle' | 'thinking' | 'speaking';

export default function AskBudPanel() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const sessionIdRef = useRef<string>('');
  if (!sessionIdRef.current) {
    sessionIdRef.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : '00000000-0000-4000-8000-000000000000';
  }

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [exhausted, setExhausted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [topic, setTopic] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const threadRef = useRef<HTMLDivElement | null>(null);
  const orbCoreRef = useRef<HTMLDivElement | null>(null);
  const orbRingRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Auto-scroll thread
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, loading]);

  // Scroll-aware topic tracking
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-guide-topic]'));
    if (sections.length === 0) return;

    const visible = new Set<HTMLElement>();
    const pick = () => {
      if (visible.size === 0) {
        setTopic(null);
        return;
      }
      const centre = window.innerHeight / 2;
      let best: HTMLElement | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      visible.forEach((el) => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - centre);
        if (dist < bestDist) {
          bestDist = dist;
          best = el;
        }
      });
      setTopic(best ? (best as HTMLElement).dataset.guideTopic ?? null : null);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) visible.add(el);
          else visible.delete(el);
        });
        pick();
      },
      { threshold: 0.15 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const stopAudio = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (ctxRef.current) {
      void ctxRef.current.close().catch(() => undefined);
      ctxRef.current = null;
    }
    analyserRef.current = null;
    if (orbCoreRef.current) orbCoreRef.current.style.transform = '';
    if (orbRingRef.current) orbRingRef.current.style.opacity = '';
    setOrbState((s) => (s === 'speaking' ? 'idle' : s));
  }, []);

  useEffect(() => stopAudio, [stopAudio]);

  const speak = useCallback(
    async (text: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('text-to-voice', {
          body: { text, voice: 'female' },
        });
        const audioContent = (data as { audioContent?: string } | null)?.audioContent;
        if (error || !audioContent) return;

        stopAudio();
        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        audioRef.current = audio;

        try {
          const AudioCtor: typeof AudioContext | undefined =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioCtor) {
            const ctx = new AudioCtor();
            if (ctx.state === 'suspended') {
              await ctx.resume().catch(() => undefined);
            }

            if (ctx.state !== 'suspended') {
              ctxRef.current = ctx;
              const source = ctx.createMediaElementSource(audio);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 256;
              analyserRef.current = analyser;
              source.connect(analyser);
              analyser.connect(ctx.destination);

              const bins = new Uint8Array(analyser.frequencyBinCount);
              const tick = () => {
                const a = analyserRef.current;
                if (!a) return;
                a.getByteFrequencyData(bins);
                let sum = 0;
                const count = Math.min(16, bins.length);
                for (let i = 0; i < count; i++) sum += bins[i];
                const level = Math.min(1, sum / count / 180);
                if (orbCoreRef.current) {
                  orbCoreRef.current.style.transform = `scale(${(1 + level * 0.22).toFixed(3)})`;
                }
                if (orbRingRef.current) {
                  orbRingRef.current.style.opacity = (0.25 + level * 0.7).toFixed(3);
                }
                rafRef.current = requestAnimationFrame(tick);
              };
              if (!reducedMotion) rafRef.current = requestAnimationFrame(tick);
            } else {
              analyserRef.current = null;
              await ctx.close().catch(() => undefined);
            }
          }
        } catch {
          // Analyser unavailable — plain playback still fine.
        }

        audio.addEventListener('ended', stopAudio);
        setOrbState('speaking');
        await audio.play().catch(() => {
          stopAudio();
        });
      } catch {
        // Audio is an enhancement, never a dependency.
      }
    },
    [reducedMotion, stopAudio],
  );

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim().slice(0, 500);
      if (!message || loading || exhausted) return;

      stopAudio();
      setFailed(false);
      setLastMessage(message);
      setInput('');
      setTurns((prev) => [...prev, { role: 'user', content: message }]);
      setLoading(true);
      setOrbState('thinking');

      const history = turns.slice(-6).map((t) => ({ role: t.role, content: t.content }));

      try {
        const { data, error } = await supabase.functions.invoke('public-guide-chat', {
          body: {
            message,
            session_id: sessionIdRef.current,
            lang: (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0],
            history,
          },
        });
        const payload = data as GuideResponse | null;
        if (error || !payload?.answer) {
          setFailed(true);
          setOrbState('idle');
          return;
        }

        setTurns((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: payload.answer,
            citations: payload.citations ?? [],
            nextStep: payload.next_step ?? null,
          },
        ]);
        if (payload.disabled === true || payload.turns_remaining === 0) setExhausted(true);

        if (soundOn) {
          void speak(payload.answer);
        } else {
          setOrbState('idle');
        }
      } catch {
        setFailed(true);
        setOrbState('idle');
      } finally {
        setLoading(false);
      }
    },
    [exhausted, i18n.language, i18n.resolvedLanguage, loading, soundOn, speak, stopAudio, turns],
  );

  const chips = useMemo(() => (topic && TOPIC_CHIPS[topic]) || STARTER_CHIPS, [topic]);
  const exchanges = turns.filter((t) => t.role === 'assistant').length;
  const showChips = exchanges < 2 && !exhausted;

  const toggleSound = () => {
    setSoundOn((on) => {
      if (on) stopAudio();
      return !on;
    });
  };

  const orbAnimated = !reducedMotion;

  return (
    <section className="w-full bg-gradient-to-b from-secondary/5 via-background to-primary/5">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">Ask Bud</h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              A real conversation about Maryland dispensaries — ask anything, out loud or typed. Free,
              anonymous, no account.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 backdrop-blur-sm p-5 md:p-7">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Orb column */}
              <div className="flex flex-col items-center gap-3 md:w-40 shrink-0">
                <div
                  aria-hidden="true"
                  className="relative h-24 w-24 md:h-32 md:w-32 flex items-center justify-center"
                >
                  <div
                    ref={orbRingRef}
                    className={`absolute inset-0 rounded-full border border-primary/40 ${
                      orbAnimated
                        ? orbState === 'thinking'
                          ? 'animate-spin [animation-duration:3s] opacity-70'
                          : 'animate-ping [animation-duration:3.5s] opacity-40'
                        : 'opacity-40'
                    }`}
                  />
                  <div
                    className={`absolute inset-3 rounded-full border border-primary/30 ${
                      orbAnimated
                        ? orbState === 'thinking'
                          ? 'animate-pulse [animation-duration:1s]'
                          : 'animate-pulse [animation-duration:4s]'
                        : ''
                    }`}
                  />
                  <div
                    ref={orbCoreRef}
                    style={{
                      background:
                        'radial-gradient(circle at 35% 30%, hsl(var(--primary) / 0.85), hsl(var(--primary) / 0.35) 55%, hsl(var(--primary) / 0.08) 100%)',
                      transition: 'transform 90ms linear, opacity 300ms ease',
                    }}
                    className={`absolute inset-5 rounded-full shadow-lg ${
                      orbAnimated
                        ? orbState === 'thinking'
                          ? 'animate-pulse [animation-duration:1.2s]'
                          : orbState === 'idle'
                            ? 'animate-pulse [animation-duration:4s]'
                            : ''
                        : ''
                    }`}
                  />
                </div>

                {orbState === 'thinking' && (
                  <div className="flex items-center gap-1" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full bg-primary/70 ${
                          orbAnimated ? 'animate-bounce' : ''
                        }`}
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={toggleSound}
                    aria-label={soundOn ? "Turn Bud's voice off" : "Turn Bud's voice on"}
                  >
                    {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  {orbState === 'speaking' && (
                    <Button type="button" variant="outline" size="icon" onClick={stopAudio} aria-label="Stop">
                      <Square className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Conversation column */}
              <div className="flex-1 min-w-0">
                <div ref={threadRef} className="max-h-[420px] overflow-y-auto pe-1 space-y-5">
                  {turns.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      Ask a question below — Bud answers in plain language and points you to the rule
                      it came from.
                    </p>
                  )}

                  {turns.map((turn, idx) => {
                    const isLastAssistant =
                      turn.role === 'assistant' && idx === turns.length - 1;
                    if (turn.role === 'user') {
                      return (
                        <div key={idx} className="flex justify-end">
                          <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground text-end">
                            {turn.content}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={idx}
                        className="space-y-3 text-start"
                        aria-live={isLastAssistant ? 'polite' : undefined}
                      >
                        <div className="space-y-2 text-sm leading-relaxed text-foreground">
                          {turn.content.split('\n\n').map((para, pIdx) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                        </div>

                        {turn.citations && turn.citations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">Sources:</span>
                            {turn.citations.map((c, cIdx) => (
                              <a
                                key={`${c.section}-${cIdx}`}
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={c.title}
                              >
                                <Badge variant="outline" className="text-xs">
                                  COMAR {c.section}
                                </Badge>
                              </a>
                            ))}
                          </div>
                        )}

                        {turn.nextStep && (
                          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                            <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                Keep going — {turn.nextStep.module_title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Module {turn.nextStep.module_number} of {turn.nextStep.course_title} · free
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (turn.nextStep) navigate(turn.nextStep.url);
                              }}
                            >
                              Start
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {failed && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>I couldn&apos;t reach Bud just then.</span>
                      <Button size="sm" variant="outline" onClick={() => void send(lastMessage)}>
                        Try again
                      </Button>
                    </div>
                  )}
                </div>

                {exhausted && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Bud&apos;s taken a break for now — the free courses below pick up right where we
                    left off.
                  </p>
                )}

                {showChips && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {chips.map((chip) => (
                      <Button
                        key={chip}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => void send(chip)}
                      >
                        {chip}
                      </Button>
                    ))}
                  </div>
                )}

                <form
                  className="mt-4 flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                >
                  <Input
                    value={input}
                    maxLength={500}
                    disabled={loading || exhausted}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your first visit, the rules, products…"
                    aria-label="Ask Bud a question"
                  />
                  
                  <Button type="submit" disabled={loading || exhausted || !input.trim()} aria-label="Send">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground max-w-3xl mx-auto">
            Bud is free public education for adults 21+ and registered Maryland patients. Not medical or
            legal advice, and not Maryland RVT certification. Rules come from COMAR Title 14, Subtitle 17
            — always confirm current rules with the Maryland Cannabis Administration.
          </p>
        </div>
      </div>
    </section>
  );
}
