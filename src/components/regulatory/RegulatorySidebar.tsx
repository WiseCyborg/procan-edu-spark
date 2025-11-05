import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, ChevronDown, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { useRegulatoryContent } from '@/hooks/useRegulatoryContent';
import { Skeleton } from '@/components/ui/skeleton';

interface RegulatorySidebarProps {
  sectionNumber?: string;
  comarReference?: string;
}

export const RegulatorySidebar = ({ sectionNumber, comarReference }: RegulatorySidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: regulatoryContent, isLoading } = useRegulatoryContent(sectionNumber);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const content = regulatoryContent?.[0];

  if (!content) {
    return null;
  }

  const officialLink = comarReference 
    ? `https://dsd.maryland.gov/regulations/Pages/10.62.aspx#${comarReference}`
    : 'https://dsd.maryland.gov/regulations/Pages/10.62.aspx';

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Live COMAR Reference</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="font-mono text-xs">
            {content.section_number}
          </Badge>
          <a
            href={officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View Official Text
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {content.section_title && (
          <h4 className="font-semibold text-sm">{content.section_title}</h4>
        )}

        {content.plain_language_summary && (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Summary:</p>
            <p>{content.plain_language_summary}</p>
          </div>
        )}

        {content.compliance_tips && Array.isArray(content.compliance_tips) && content.compliance_tips.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Compliance Tips:</p>
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                  {content.compliance_tips.map((tip: string, index: number) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {isExpanded && content.content_text && (
          <ScrollArea className="h-64 rounded-md border p-3">
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">
              {content.content_text}
            </div>
          </ScrollArea>
        )}

        {content.last_modified_at && (
          <p className="text-xs text-muted-foreground">
            Last MCA Review: {new Date(content.last_modified_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
