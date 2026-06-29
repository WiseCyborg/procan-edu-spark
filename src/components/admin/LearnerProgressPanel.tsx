import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RefreshCw, GraduationCap, Users, Search, Award, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';
const TOTAL_MODULES = 24;

// Brand palette (per spec)
const BRAND = {
  bg: '#1a3a2a',
  bgSoft: '#22422f',
  bgSofter: '#2b5238',
  border: '#3a6b4d',
  accent: '#52b788',
  gold: '#f9c74f',
  text: '#e8f3ec',
  textMuted: '#a8c4b3',
};

interface LearnerRow {
  user_id: string;
  email: string;
  full_name: string;
  modules_completed: number;
  current_module_number: number;
  last_activity: string | null;
  total_time_minutes: number;
  certified: boolean;
  certificate_date: string | null;
}

interface QuizScore {
  module_number: number;
  score: number;
  completed_at: string | null;
}

type StatusKind = 'Certified' | 'In Progress' | 'Not Started';

const getStatus = (row: LearnerRow): StatusKind => {
  if (row.certified) return 'Certified';
  if (row.modules_completed > 0) return 'In Progress';
  return 'Not Started';
};

export function LearnerProgressPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLearners = async () => {
    setRefreshing(true);
    try {
      // 1. All progress rows for this course
      const { data: progressRows, error: progErr } = await supabase
        .from('user_progress')
        .select('user_id, module_id, is_completed, time_spent, updated_at')
        .eq('course_id', COURSE_ID);
      if (progErr) throw progErr;

      // 2. Module map to translate module_id -> module_number
      const { data: modules } = await supabase
        .from('course_modules')
        .select('id, module_number')
        .eq('course_id', COURSE_ID);
      const moduleNumberById = new Map<string, number>(
        (modules ?? []).map((m: any) => [m.id, m.module_number]),
      );

      // 3. Certificates
      const { data: certs } = await supabase
        .from('certificates')
        .select('user_id, issue_date, created_at, is_revoked')
        .eq('course_id', COURSE_ID);
      const certByUser = new Map<string, { date: string }>();
      (certs ?? []).forEach((c: any) => {
        if (c.is_revoked) return;
        const date = c.issue_date ?? c.created_at;
        const existing = certByUser.get(c.user_id);
        if (!existing || new Date(date) > new Date(existing.date)) {
          certByUser.set(c.user_id, { date });
        }
      });

      // Aggregate per user
      const perUser = new Map<string, {
        completedModules: Set<string>;
        time: number;
        last: string | null;
        currentModule: number;
      }>();
      (progressRows ?? []).forEach((r: any) => {
        let agg = perUser.get(r.user_id);
        if (!agg) {
          agg = { completedModules: new Set(), time: 0, last: null, currentModule: 0 };
          perUser.set(r.user_id, agg);
        }
        if (r.is_completed && r.module_id) agg.completedModules.add(r.module_id);
        agg.time += r.time_spent ?? 0;
        if (r.updated_at && (!agg.last || new Date(r.updated_at) > new Date(agg.last))) {
          agg.last = r.updated_at;
        }
        const num = r.module_id ? moduleNumberById.get(r.module_id) ?? 0 : 0;
        if (num > agg.currentModule) agg.currentModule = num;
      });

      const userIds = Array.from(
        new Set<string>([...perUser.keys(), ...certByUser.keys()]),
      );

      if (userIds.length === 0) {
        setLearners([]);
        return;
      }

      // 4. Profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email_cache')
        .in('user_id', userIds);

      const rows: LearnerRow[] = (profiles ?? []).map((p: any) => {
        const agg = perUser.get(p.user_id);
        const cert = certByUser.get(p.user_id);
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
        return {
          user_id: p.user_id,
          email: p.email_cache ?? '—',
          full_name: name || (p.email_cache ?? 'Unnamed Learner'),
          modules_completed: agg?.completedModules.size ?? 0,
          current_module_number: agg?.currentModule ?? 0,
          last_activity: agg?.last ?? null,
          total_time_minutes: Math.round((agg?.time ?? 0) / 60),
          certified: !!cert,
          certificate_date: cert?.date ?? null,
        };
      });

      rows.sort((a, b) => {
        const ad = a.last_activity ? new Date(a.last_activity).getTime() : 0;
        const bd = b.last_activity ? new Date(b.last_activity).getTime() : 0;
        return bd - ad;
      });

      setLearners(rows);
    } catch (e) {
      console.error('[LearnerProgressPanel] fetchLearners failed', e);
      setLearners([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLearners();
  }, []);

  // Load quiz scores when a learner is selected
  useEffect(() => {
    if (!selectedId) {
      setQuizScores([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const { data: rows } = await supabase
          .from('user_progress')
          .select('module_id, score, completed_at, updated_at')
          .eq('course_id', COURSE_ID)
          .eq('user_id', selectedId)
          .not('score', 'is', null);

        const { data: modules } = await supabase
          .from('course_modules')
          .select('id, module_number')
          .eq('course_id', COURSE_ID);
        const numById = new Map<string, number>(
          (modules ?? []).map((m: any) => [m.id, m.module_number]),
        );

        const scores: QuizScore[] = (rows ?? [])
          .map((r: any) => ({
            module_number: r.module_id ? numById.get(r.module_id) ?? 0 : 0,
            score: r.score ?? 0,
            completed_at: r.completed_at ?? r.updated_at ?? null,
          }))
          .filter((s) => s.module_number > 0)
          .sort((a, b) => a.module_number - b.module_number);

        if (!cancelled) setQuizScores(scores);
      } catch (e) {
        console.error('[LearnerProgressPanel] quiz fetch failed', e);
        if (!cancelled) setQuizScores([]);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return learners;
    return learners.filter(
      (l) => l.email.toLowerCase().includes(q) || l.full_name.toLowerCase().includes(q),
    );
  }, [learners, search]);

  const selected = learners.find((l) => l.user_id === selectedId) ?? null;

  const statusBadge = (s: StatusKind) => {
    if (s === 'Certified')
      return (
        <Badge style={{ background: BRAND.gold, color: BRAND.bg, border: 'none' }}>
          Certified
        </Badge>
      );
    if (s === 'In Progress')
      return (
        <Badge style={{ background: BRAND.accent, color: BRAND.bg, border: 'none' }}>
          In Progress
        </Badge>
      );
    return (
      <Badge
        variant="outline"
        style={{ borderColor: BRAND.border, color: BRAND.textMuted, background: 'transparent' }}
      >
        Not Started
      </Badge>
    );
  };

  const renderBar = (pct: number, height = 6) => (
    <div
      style={{
        background: BRAND.bgSofter,
        borderRadius: 999,
        height,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: pct >= 100 ? BRAND.gold : BRAND.accent,
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );

  return (
    <Card style={{ background: BRAND.bg, borderColor: BRAND.border, color: BRAND.text }}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5" style={{ color: BRAND.accent }} />
            <div>
              <CardTitle style={{ color: BRAND.text }}>Learner Progress</CardTitle>
              <CardDescription style={{ color: BRAND.textMuted }}>
                RVT course — live progress, time-on-task, and certification status
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={fetchLearners}
            disabled={refreshing}
            style={{
              background: BRAND.accent,
              color: BRAND.bg,
              border: 'none',
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="large" label="Loading learners…" />
          </div>
        ) : learners.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center gap-3"
            style={{ color: BRAND.textMuted }}
          >
            <Users className="h-10 w-10" style={{ color: BRAND.accent }} />
            <p className="font-semibold" style={{ color: BRAND.text }}>
              No learners enrolled yet
            </p>
            <p className="text-sm max-w-md">
              Once students start the RVT course, their progress will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT — list */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: BRAND.textMuted }}
                />
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  style={{
                    background: BRAND.bgSoft,
                    borderColor: BRAND.border,
                    color: BRAND.text,
                  }}
                />
              </div>
              <div
                className="text-xs uppercase tracking-wide font-semibold"
                style={{ color: BRAND.textMuted }}
              >
                {filtered.length} learner{filtered.length === 1 ? '' : 's'}
              </div>
              <ScrollArea className="h-[520px] pr-2">
                <div className="flex flex-col gap-2">
                  {filtered.map((l) => {
                    const pct = Math.round((l.modules_completed / TOTAL_MODULES) * 100);
                    const isSelected = l.user_id === selectedId;
                    return (
                      <button
                        key={l.user_id}
                        onClick={() => setSelectedId(l.user_id)}
                        className="text-left rounded-lg p-3 transition-colors"
                        style={{
                          background: isSelected ? BRAND.bgSofter : BRAND.bgSoft,
                          border: `1px solid ${isSelected ? BRAND.accent : BRAND.border}`,
                          color: BRAND.text,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate" style={{ color: BRAND.text }}>
                              {l.full_name}
                            </div>
                            <div
                              className="text-xs truncate"
                              style={{ color: BRAND.textMuted }}
                            >
                              {l.email}
                            </div>
                          </div>
                          {statusBadge(getStatus(l))}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1">{renderBar(pct)}</div>
                          <div
                            className="text-xs font-mono tabular-nums"
                            style={{ color: BRAND.textMuted }}
                          >
                            {l.modules_completed}/{TOTAL_MODULES}
                          </div>
                        </div>
                        <div className="text-xs" style={{ color: BRAND.textMuted }}>
                          {l.last_activity
                            ? `Active ${formatDistanceToNow(new Date(l.last_activity), { addSuffix: true })}`
                            : 'No activity yet'}
                        </div>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div
                      className="text-sm text-center py-8"
                      style={{ color: BRAND.textMuted }}
                    >
                      No learners match "{search}"
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* RIGHT — detail */}
            <div
              className="lg:col-span-3 rounded-lg p-5"
              style={{
                background: BRAND.bgSoft,
                border: `1px solid ${BRAND.border}`,
                minHeight: 560,
              }}
            >
              {!selected ? (
                <div
                  className="flex flex-col items-center justify-center h-full text-center gap-3"
                  style={{ color: BRAND.textMuted, minHeight: 520 }}
                >
                  <Users className="h-10 w-10" style={{ color: BRAND.accent }} />
                  <p className="font-semibold" style={{ color: BRAND.text }}>
                    Select a learner
                  </p>
                  <p className="text-sm max-w-sm">
                    Click any learner on the left to view module-level progress, quiz scores,
                    and certification status.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-xl font-bold" style={{ color: BRAND.text }}>
                        {selected.full_name}
                      </div>
                      <div className="text-sm" style={{ color: BRAND.textMuted }}>
                        {selected.email}
                      </div>
                    </div>
                    {statusBadge(getStatus(selected))}
                  </div>

                  {/* Overall progress */}
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <div className="text-sm" style={{ color: BRAND.textMuted }}>
                        Overall progress
                      </div>
                      <div
                        className="text-3xl font-bold tabular-nums"
                        style={{ color: BRAND.accent }}
                      >
                        {Math.round((selected.modules_completed / TOTAL_MODULES) * 100)}%
                      </div>
                    </div>
                    {renderBar(
                      (selected.modules_completed / TOTAL_MODULES) * 100,
                      12,
                    )}
                  </div>

                  {/* Stat grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat
                      label="Modules done"
                      value={`${selected.modules_completed} / ${TOTAL_MODULES}`}
                    />
                    <Stat
                      label="Current module"
                      value={selected.current_module_number > 0 ? `#${selected.current_module_number}` : '—'}
                    />
                    <Stat
                      label="Time in course"
                      value={`${selected.total_time_minutes} min`}
                      icon={<Clock className="h-3.5 w-3.5" />}
                    />
                    <Stat
                      label="Last login"
                      value={
                        selected.last_activity
                          ? format(new Date(selected.last_activity), 'MMM d, h:mma')
                          : '—'
                      }
                    />
                  </div>

                  {/* Certificate */}
                  <div
                    className="rounded-md p-3 flex items-center gap-3"
                    style={{
                      background: selected.certified ? `${BRAND.gold}22` : BRAND.bgSofter,
                      border: `1px solid ${selected.certified ? BRAND.gold : BRAND.border}`,
                    }}
                  >
                    <Award
                      className="h-5 w-5"
                      style={{ color: selected.certified ? BRAND.gold : BRAND.textMuted }}
                    />
                    <div className="flex-1">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: selected.certified ? BRAND.gold : BRAND.text }}
                      >
                        {selected.certified ? 'Certificate earned' : 'Certificate not yet earned'}
                      </div>
                      {selected.certified && selected.certificate_date && (
                        <div className="text-xs" style={{ color: BRAND.textMuted }}>
                          Issued {format(new Date(selected.certificate_date), 'PPP')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quiz scores */}
                  <div>
                    <div
                      className="text-sm font-semibold mb-2 flex items-center justify-between"
                      style={{ color: BRAND.text }}
                    >
                      <span>Quiz scores by module</span>
                      {detailLoading && (
                        <span className="text-xs" style={{ color: BRAND.textMuted }}>
                          Loading…
                        </span>
                      )}
                    </div>
                    {quizScores.length === 0 ? (
                      <div
                        className="text-sm rounded-md p-3 text-center"
                        style={{
                          background: BRAND.bgSofter,
                          color: BRAND.textMuted,
                          border: `1px dashed ${BRAND.border}`,
                        }}
                      >
                        No quiz scores recorded yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {quizScores.map((q) => {
                          const passed = q.score >= 80;
                          return (
                            <div
                              key={`${q.module_number}-${q.completed_at}`}
                              className="rounded-md p-2 flex items-center justify-between"
                              style={{
                                background: BRAND.bgSofter,
                                border: `1px solid ${passed ? BRAND.accent : BRAND.border}`,
                              }}
                            >
                              <span className="text-xs" style={{ color: BRAND.textMuted }}>
                                Mod {q.module_number}
                              </span>
                              <span
                                className="text-sm font-bold tabular-nums"
                                style={{ color: passed ? BRAND.accent : BRAND.gold }}
                              >
                                {q.score}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-md p-3"
      style={{ background: BRAND.bgSofter, border: `1px solid ${BRAND.border}` }}
    >
      <div
        className="text-[11px] uppercase tracking-wide font-semibold flex items-center gap-1"
        style={{ color: BRAND.textMuted }}
      >
        {icon}
        {label}
      </div>
      <div className="text-base font-bold mt-1" style={{ color: BRAND.text }}>
        {value}
      </div>
    </div>
  );
}
