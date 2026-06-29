import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertTriangle, ArrowUpDown, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReportResult {
  columns: string[];
  rows: unknown[][];
  sql: string;
}

interface HistoryItem {
  question: string;
  at: number;
}

const PRESETS = [
  'How many learners completed this week?',
  'Which modules have the lowest completion rates?',
  'How many seats are unused?',
  'Show all dispensaries by seat usage',
  "Which learners haven't started yet?",
  'Certificates issued this month',
];

function toCsv(columns: string[], rows: unknown[][]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export default function AdminReports() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sort, setSort] = useState<{ col: number; dir: 'asc' | 'desc' } | null>(null);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSort(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-ai-report', {
        body: { question: q },
      });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setResult(data as ReportResult);
      setHistory((h) => [{ question: q, at: Date.now() }, ...h].slice(0, 10));
    } catch (e) {
      setError((e as Error).message || 'Report failed');
    } finally {
      setLoading(false);
    }
  };

  const sortedRows = useMemo(() => {
    if (!result) return [];
    if (!sort) return result.rows;
    const { col, dir } = sort;
    const copy = [...result.rows];
    copy.sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [result, sort]);

  const exportCsv = () => {
    if (!result) return;
    const csv = toCsv(result.columns, sortedRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Reports
        </h1>
        <p className="text-muted-foreground">Ask natural-language questions; we generate and run a read-only SQL query.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ask</CardTitle>
              <CardDescription>Read-only queries, limited to 500 rows.</CardDescription>
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
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>{result.rows.length} row{result.rows.length === 1 ? '' : 's'}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={result.rows.length === 0}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rows returned.</p>
                ) : (
                  <div className="max-h-[480px] overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted text-left">
                        <tr>
                          {result.columns.map((c, i) => (
                            <th key={c} className="px-3 py-2 font-medium">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:underline"
                                onClick={() =>
                                  setSort((s) =>
                                    s?.col === i
                                      ? { col: i, dir: s.dir === 'asc' ? 'desc' : 'asc' }
                                      : { col: i, dir: 'asc' },
                                  )
                                }
                              >
                                {c}
                                <ArrowUpDown className="h-3 w-3 opacity-60" />
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row, i) => (
                          <tr key={i} className="border-t">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 align-top">
                                {cell === null || cell === undefined
                                  ? '—'
                                  : typeof cell === 'object'
                                  ? JSON.stringify(cell)
                                  : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Generated SQL</summary>
                  <pre className="mt-2 overflow-auto rounded bg-muted p-2">{result.sql}</pre>
                </details>
              </CardContent>
            </Card>
          )}
        </div>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
              <CardDescription>Last {history.length || 0} questions this session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No queries yet.</p>
              ) : (
                history.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setQuestion(h.question);
                      run(h.question);
                    }}
                  >
                    {h.question}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
