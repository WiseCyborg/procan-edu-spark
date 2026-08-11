import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Sparkles, AlertTriangle, Library, ChevronDown, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface ReportResult {
  columns: string[];
  rows: unknown[][];
  sql: string;
}

interface DocVersion {
  version: number;
  version_title: string;
  doc_date: string | null;
  pdf_path: string;
  md_sha256: string;
  source_path: string;
  source_bytes: number;
  pdf_bytes: number;
  is_current: boolean;
  stored: boolean;
}

interface DocLineage {
  doc_key: string;
  title: string;
  category: string;
  relation_type: 'revision' | 'part';
  current_version: number;
  version_count: number;
  first_doc_date: string | null;
  last_doc_date: string | null;
  versions: DocVersion[];
}

interface DocLibraryResponse {
  generated_at: string;
  totals: { lineages: number; versions: number; stored: number; missing: number };
  documents: DocLineage[];
}

const CATEGORY_ORDER = [
  'Foundation',
  'Go-Live',
  'Compliance',
  'Payments',
  'Video',
  'Communication',
  'Seams & UAT',
  'Operations',
  'Security',
];

const PRESETS = [
  'How many learners completed this week?',
  'Which modules have the lowest completion rates?',
  'How many seats are unused?',
];

async function invokeDocLibrary<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('doc-library', { body });
  if (error) {
    let detail = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = await ctx.json();
        if (parsed?.error) detail = String(parsed.error);
      }
    } catch { /* keep original message */ }
    throw new Error(detail);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

function DocumentLibrarySection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [libError, setLibError] = useState<string | null>(null);
  const [library, setLibrary] = useState<DocLibraryResponse | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (!next || library || loading) return;
    setLoading(true);
    setLibError(null);
    try {
      const data = await invokeDocLibrary<DocLibraryResponse>({ action: 'list' });
      setLibrary(data);
    } catch (e) {
      setLibError((e as Error).message || 'Failed to load document library');
    } finally {
      setLoading(false);
    }
  };

  const download = async (pdfPath: string) => {
    try {
      const data = await invokeDocLibrary<{ url: string }>({ action: 'signed_url', pdf_path: pdfPath });
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error((e as Error).message || 'Could not open document');
    }
  };

  const grouped = React.useMemo(() => {
    if (!library) return [] as Array<[string, DocLineage[]]>;
    const map = new Map<string, DocLineage[]>();
    for (const d of library.documents) {
      const key = d.category || 'Uncategorized';
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    const known = CATEGORY_ORDER.filter((c) => map.has(c));
    const rest = [...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort((a, b) => a.localeCompare(b));
    return [...known, ...rest].map((c) => [c, map.get(c)!] as [string, DocLineage[]]);
  }, [library]);

  return (
    <div className="border-t pt-4">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-start">
          <div className="flex items-start gap-2">
            <Library className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Document Library</span>
                {library && <Badge variant="secondary">{library.totals.lineages}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">Every project document, versioned.</p>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading documents…
            </div>
          )}

          {libError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{libError}</AlertDescription>
            </Alert>
          )}

          {library && !loading && (
            <TooltipProvider>
              {library.totals.missing > 0 && (
                <p className="mb-2 text-xs text-muted-foreground">
                  {library.totals.stored} of {library.totals.versions} PDFs uploaded to storage.
                </p>
              )}
              <div className="max-h-[28rem] overflow-y-auto rounded-md border bg-muted/30 p-3 space-y-4">
                {grouped.map(([category, docs]) => (
                  <div key={category} className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{category}</p>
                    {docs.map((doc) => {
                      const isPart = doc.relation_type === 'part';
                      const noun = isPart ? 'part' : 'version';
                      const isOpen = !!expanded[doc.doc_key];
                      return (
                        <div key={doc.doc_key} className="rounded-md border bg-background">
                          <button
                            type="button"
                            onClick={() => setExpanded((s) => ({ ...s, [doc.doc_key]: !s[doc.doc_key] }))}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start"
                          >
                            <span className="truncate text-sm" title={doc.title}>{doc.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {doc.version_count} {doc.version_count === 1 ? noun : `${noun}s`}
                            </span>
                          </button>
                          {isOpen && (
                            <div className="border-t">
                              {doc.versions.map((v) => (
                                <div key={v.pdf_path} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                                  <Badge variant="secondary" className="font-mono">
                                    {isPart ? `pt${v.version}` : `v${v.version}`}
                                  </Badge>
                                  <span className="truncate" title={v.version_title}>{v.version_title}</span>
                                  <span className="shrink-0 text-muted-foreground">{v.doc_date ?? '—'}</span>
                                  <span className="ms-auto shrink-0">
                                    {v.stored ? (
                                      <Button variant="ghost" size="sm" onClick={() => download(v.pdf_path)}>
                                        <Download className="h-4 w-4 me-2" />
                                        PDF
                                      </Button>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-muted-foreground">not uploaded</span>
                                        </TooltipTrigger>
                                        <TooltipContent>PDF not yet uploaded to storage</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function AIReportingSummaryPanel() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-ai-report', {
        body: { question: q },
      });
      if (error) {
        let detail = error.message;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) detail = String(body.error);
          }
        } catch { /* keep original message */ }
        throw new Error(detail);
      }
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setResult(data as ReportResult);
    } catch (e) {
      setError((e as Error).message || 'Report failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Reporting
          </CardTitle>
          <CardDescription>Ask a natural-language question about your platform data.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/reports">Open full reports</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(question);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your data..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p}
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => {
                setQuestion(p);
                run(p);
              }}
            >
              {p}
            </Button>
          ))}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="rounded-md border bg-muted/30">
            {result.rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No rows returned.</p>
            ) : (
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-start">
                    <tr>
                      {result.columns.map((c) => (
                        <th key={c} className="px-3 py-2 font-medium">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 25).map((row, i) => (
                      <tr key={i} className="border-t">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 align-top">
                            {cell === null || cell === undefined ? '—' : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 25 && (
                  <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                    Showing first 25 of {result.rows.length} rows. Open full reports for the rest.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DocumentLibrarySection />
      </CardContent>
    </Card>
  );
}

export default AIReportingSummaryPanel;
