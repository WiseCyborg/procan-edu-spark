import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface ReportResult {
  columns: string[];
  rows: unknown[][];
  sql: string;
}

const PRESETS = [
  'How many learners completed this week?',
  'Which modules have the lowest completion rates?',
  'How many seats are unused?',
];

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
      if (error) throw new Error(error.message);
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
                  <thead className="bg-muted text-left">
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
      </CardContent>
    </Card>
  );
}

export default AIReportingSummaryPanel;
