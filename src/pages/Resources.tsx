import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Leaf, GraduationCap, Users, Download, BookOpen, LucideIcon } from 'lucide-react';

interface ResourceGuide {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  audience: string | null;
  audience_tag: string | null;
  description: string | null;
  public_url: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Leaf,
  GraduationCap,
  Users,
  BookOpen,
};

const Resources: React.FC = () => {
  const { data: guides, isLoading } = useQuery({
    queryKey: ['resource-guides'],
    queryFn: async (): Promise<ResourceGuide[]> => {
      const { data, error } = await (supabase as any)
        .from('resource_guides')
        .select('id, slug, title, subtitle, audience, audience_tag, description, public_url, icon, color, sort_order')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as ResourceGuide[];
    },
  });

  return (
    <main className="container mx-auto px-4 py-12 max-w-6xl">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Resources &amp; Guides</h1>
        <p className="text-lg text-muted-foreground">
          Download the right guide for your role
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-lg mb-3" />
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full mb-4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !guides || guides.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground">
              Downloadable guides will be available here shortly. Check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {guides.map((guide) => {
            const Icon = ICON_MAP[guide.icon || 'BookOpen'] || BookOpen;
            const color = guide.color || '#166534';
            return (
              <Card key={guide.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {guide.audience_tag && (
                    <Badge
                      variant="secondary"
                      className="w-fit mb-2 border-0"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {guide.audience_tag}
                    </Badge>
                  )}
                  <CardTitle className="text-xl">{guide.title}</CardTitle>
                  {guide.subtitle && (
                    <CardDescription>{guide.subtitle}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  {guide.description && (
                    <p className="text-sm text-muted-foreground">{guide.description}</p>
                  )}
                  <Button
                    asChild
                    className="w-full bg-green-700 hover:bg-green-800 text-white"
                    disabled={!guide.public_url}
                  >
                    <a
                      href={guide.public_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Guide (PDF)
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default Resources;
