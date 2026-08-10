import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Lock, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Seo } from '@/components/Seo';
import { cn } from '@/lib/utils';

interface ModuleRow {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  estimated_minutes: number | null;
}

const SpecialtyCoursePlayer = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [courseTitle, setCourseTitle] = useState<string>('');
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const activeModuleId = searchParams.get('module');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!courseId || authLoading) return;
      setIsLoading(true);

      const [{ data: course }, { data: mods, error: modsError }] = await Promise.all([
        supabase.from('courses').select('title').eq('id', courseId).maybeSingle(),
        supabase
          .from('course_modules')
          .select('id, module_number, title, description, content, video_url, estimated_minutes')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .order('module_number', { ascending: true }),
      ]);

      if (cancelled) return;

      setCourseTitle(course?.title ?? 'Course');

      if (modsError) console.error('[SpecialtyCoursePlayer] modules error', modsError);

      const rows = (mods ?? []) as ModuleRow[];
      setModules(rows);
      // RLS returns zero rows when the learner has no active entitlement.
      setLocked(rows.length === 0);
      setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, user, authLoading]);

  const activeModule = useMemo(
    () => modules.find((m) => m.id === activeModuleId) ?? modules[0] ?? null,
    [modules, activeModuleId]
  );

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Course content is locked</h1>
        <p className="text-muted-foreground max-w-md">
          You need an active enrollment for this course before you can access its modules.
        </p>
        <Button asChild>
          <Link to={`/courses/${courseId}`}>View course details</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title={`${courseTitle} | ProCann Edu`} description={`Course modules for ${courseTitle}.`} path={`/courses/${courseId}/learn`} />

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(`/courses/${courseId}`)}>
          <ArrowLeft className="h-4 w-4 me-2 rtl-flip" />
          Course overview
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">{courseTitle}</h1>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          <aside className="space-y-2">
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => setSearchParams({ module: m.id })}
                className={cn(
                  'w-full text-start px-3 py-2 rounded-md border text-sm transition-colors',
                  activeModule?.id === m.id
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'border-border hover:bg-muted'
                )}
              >
                <span className="font-medium">Module {m.module_number}</span>
                <span className="block text-muted-foreground">{m.title}</span>
              </button>
            ))}
          </aside>

          <main>
            {activeModule ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Module {activeModule.module_number}: {activeModule.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeModule.description && (
                    <p className="text-muted-foreground">{activeModule.description}</p>
                  )}

                  {activeModule.video_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <PlayCircle className="h-4 w-4 text-primary" />
                      <a
                        href={activeModule.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Watch module video
                      </a>
                    </div>
                  )}

                  {activeModule.content ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {activeModule.content}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Written content for this module is being finalized.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground">No modules available yet.</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SpecialtyCoursePlayer;
