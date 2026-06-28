import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { markdownToHtml } from '@/utils/markdown-to-html';
import { sanitizeHtml } from '@/utils/sanitize-html';

const RVT_COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

interface DemoModule {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
}

const DemoPreview = () => {
  const [module, setModule] = useState<DemoModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Preview the Maryland RVT Course | ProCann Edu';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Preview Module 0 of the Maryland Responsible Vendor Training course — no signup required.'
      );
    }

    (async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('id,title,description,content,video_url')
        .eq('course_id', RVT_COURSE_ID)
        .eq('module_number', 0)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else {
        setModule(data as DemoModule | null);
      }
      setLoading(false);
    })();
  }, []);

  const contentHtml = useMemo(() => {
    if (!module?.content) return '';
    return sanitizeHtml(markdownToHtml(module.content));
  }, [module?.content]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top preview banner */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm md:text-base">
          <span className="font-medium">
            🎓 You're previewing the Maryland RVT Course
          </span>
          <Link
            to="/org/apply"
            className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 hover:no-underline"
          >
            Apply for Your Dispensary <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading preview…
          </div>
        )}

        {!loading && error && (
          <Card className="p-6 border-destructive/40">
            <p className="text-destructive font-medium">
              We couldn't load the preview module right now.
            </p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </Card>
        )}

        {!loading && !error && module && (
          <>
            <header className="space-y-2">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                Module 0 · Free Preview
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {module.title}
              </h1>
              {module.description && (
                <p className="text-base md:text-lg text-muted-foreground">
                  {module.description}
                </p>
              )}
            </header>

            {module.video_url ? (
              <video
                src={module.video_url}
                controls
                playsInline
                className="w-full aspect-video rounded-lg bg-black"
              />
            ) : (
              <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                Video coming soon
              </div>
            )}

            {contentHtml && (
              <article
                className="prose prose-sm md:prose-base max-w-none dark:prose-invert
                           prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl
                           prose-a:text-primary prose-strong:text-foreground"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            )}
          </>
        )}

        {/* Closing CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl md:text-3xl">
              Ready to certify your team?
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 justify-center pb-8">
            <Button asChild size="lg">
              <Link to="/org/apply">Apply for Dispensary Access</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/get-started">Learn More</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DemoPreview;
