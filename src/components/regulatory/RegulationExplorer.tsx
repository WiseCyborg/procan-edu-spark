import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import { useRegulatoryContent } from '@/hooks/useRegulatoryContent';
import { Skeleton } from '@/components/ui/skeleton';

export const RegulationExplorer = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: regulatoryContent, isLoading } = useRegulatoryContent();

  const filteredContent = regulatoryContent?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.section_number?.toLowerCase().includes(query) ||
      item.section_title?.toLowerCase().includes(query) ||
      item.content_text?.toLowerCase().includes(query) ||
      item.plain_language_summary?.toLowerCase().includes(query)
    );
  });

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'major':
        return 'default';
      case 'moderate':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Maryland COMAR Explorer
          </CardTitle>
          <CardDescription>
            Search and explore Maryland Cannabis Administration regulations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by COMAR section, title, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredContent && filteredContent.length > 0 ? (
          filteredContent.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {item.section_number}
                      </Badge>
                      {item.change_impact_level && (
                        <Badge variant={getImpactColor(item.change_impact_level)}>
                          {item.change_impact_level}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{item.section_title}</CardTitle>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <a
                      href={`https://dsd.maryland.gov/regulations/Pages/14.17.aspx#${item.section_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      Official Text
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.plain_language_summary && (
                  <div>
                    <p className="text-sm font-medium mb-1">Summary:</p>
                    <p className="text-sm text-muted-foreground">{item.plain_language_summary}</p>
                  </div>
                )}

                {item.compliance_tips && Array.isArray(item.compliance_tips) && item.compliance_tips.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Compliance Tips:</p>
                        <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                          {item.compliance_tips.map((tip: string, index: number) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {item.last_modified_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Last updated: {new Date(item.last_modified_at).toLocaleDateString()}
                    </div>
                  )}
                  {item.last_mca_review_date && (
                    <div className="flex items-center gap-1">
                      Last MCA review: {new Date(item.last_mca_review_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No regulations found matching your search.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
