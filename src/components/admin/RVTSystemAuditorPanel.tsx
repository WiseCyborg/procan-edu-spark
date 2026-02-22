import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, CheckCircle, XCircle, Download, Loader2, FileText } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import jsPDF from "jspdf";

type GapStatus = "PASS" | "GAP" | "UNMAPPED";

interface ComplianceRow {
  comar_requirement: string;
  system_behavior: string;
  gap_status: GapStatus;
  recommended_fix?: string;
}

interface ComplianceDelta {
  agent: string;
  generated_at: string;
  summary: { pass: number; gap: number; unmapped: number; total_modules: number; total_regulations: number };
  rows: ComplianceRow[];
}

interface E2EReport {
  test_run_id: string;
  started_at: string;
  completed_at: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  blocker_count: number;
  release_gate_status: "SHIPPABLE" | "NOT_SHIPPABLE";
  tier1_status: "PASS" | "FAIL";
  results: any[];
  journey_summaries: any[];
}

type Recommendation = "NOT_SHIPPABLE" | "NEEDS_LEGAL_REVIEW" | "SHIPPABLE" | "PENDING";

export default function RVTSystemAuditorPanel() {
  const [running, setRunning] = useState(false);
  const [techReport, setTechReport] = useState<E2EReport | null>(null);
  const [compliance, setCompliance] = useState<ComplianceDelta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gapFilter, setGapFilter] = useState<GapStatus | "ALL">("ALL");

  const execSummary = useMemo(() => {
    const totalChecks = techReport?.total_tests ?? null;
    const passedChecks = techReport?.passed_tests ?? null;
    const blockerCount = techReport?.blocker_count ?? 0;
    const technicalGate = techReport?.release_gate_status ?? null;
    const gaps = compliance?.summary?.gap ?? null;

    let recommendation: Recommendation = "PENDING";
    if (techReport && compliance) {
      if (blockerCount > 0 || technicalGate === "NOT_SHIPPABLE") recommendation = "NOT_SHIPPABLE";
      else if ((gaps ?? 0) > 0) recommendation = "NEEDS_LEGAL_REVIEW";
      else recommendation = "SHIPPABLE";
    }

    return { totalChecks, passedChecks, blockerCount, gaps, recommendation, technicalGate };
  }, [techReport, compliance]);

  async function runFullAudit() {
    setRunning(true);
    setError(null);
    setTechReport(null);
    setCompliance(null);

    try {
      toast.info("Running E2E validation...");
      const { data: tech, error: techErr } = await supabase.functions.invoke("run-e2e-validation", {
        body: { mode: "FULL" }
      });
      if (techErr) throw new Error(`E2E validation failed: ${techErr.message}`);
      setTechReport(tech);

      toast.info("Generating compliance delta...");
      const { data: comp, error: compErr } = await supabase.functions.invoke("generate-compliance-delta", {
        body: { includeUnmapped: true }
      });
      if (compErr) throw new Error(`Compliance delta failed: ${compErr.message}`);
      setCompliance(comp);

      toast.success("Full audit complete");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      toast.error("Audit failed");
    } finally {
      setRunning(false);
    }
  }

  function exportPDF() {
    const doc = new jsPDF();
    const now = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text("RVT System Audit — Executive Summary", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${now}`, 14, 28);

    let y = 40;
    doc.setFontSize(12);
    doc.text("Release Recommendation:", 14, y);
    doc.setFontSize(14);
    doc.text(execSummary.recommendation, 80, y);

    y += 14;
    doc.setFontSize(10);
    doc.text(`Technical Checks: ${execSummary.passedChecks ?? "—"} / ${execSummary.totalChecks ?? "—"} passed`, 14, y);
    y += 8;
    doc.text(`Tier 1 Blockers: ${execSummary.blockerCount}`, 14, y);
    y += 8;
    doc.text(`Compliance Gaps: ${execSummary.gaps ?? "—"}`, 14, y);

    if (compliance && compliance.rows.filter(r => r.gap_status === "GAP").length > 0) {
      y += 14;
      doc.setFontSize(12);
      doc.text("Top Compliance Gaps:", 14, y);
      y += 8;
      doc.setFontSize(9);

      const gaps = compliance.rows.filter(r => r.gap_status === "GAP").slice(0, 10);
      for (const g of gaps) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`• ${g.comar_requirement}`, 16, y);
        y += 5;
        doc.text(`  Fix: ${g.recommended_fix ?? "—"}`, 20, y);
        y += 7;
      }
    }

    doc.save("rvt-system-audit-summary.pdf");
    toast.success("PDF exported");
  }

  function exportCSV() {
    if (!compliance) return;
    const header = "COMAR Requirement,System Behavior,Gap Status,Recommended Fix";
    const csvRows = compliance.rows.map(r =>
      `"${r.comar_requirement}","${r.system_behavior}","${r.gap_status}","${r.recommended_fix ?? ""}"`
    );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-delta.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  const recommendationColor: Record<Recommendation, string> = {
    SHIPPABLE: "bg-green-100 text-green-800 border-green-300",
    NOT_SHIPPABLE: "bg-red-100 text-red-800 border-red-300",
    NEEDS_LEGAL_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-300",
    PENDING: "bg-muted text-muted-foreground border-border",
  };

  const gapStatusColor: Record<GapStatus, string> = {
    PASS: "text-green-700",
    GAP: "text-red-700 font-semibold",
    UNMAPPED: "text-yellow-700",
  };

  const filteredRows = compliance?.rows.filter(r => gapFilter === "ALL" || r.gap_status === gapFilter) ?? [];

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5" />
              RVT System Auditor
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Full pipeline validation + COMAR compliance delta for legal review
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {(techReport || compliance) && (
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            )}
            <Button onClick={runFullAudit} disabled={running}>
              {running ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Running...</> : "Run Full Audit"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        <div className={`rounded-lg border p-4 grid grid-cols-2 md:grid-cols-5 gap-3 ${recommendationColor[execSummary.recommendation]}`}>
          <div>
            <div className="text-xs opacity-70">Technical Checks</div>
            <div className="text-lg font-semibold">{execSummary.passedChecks ?? "—"} / {execSummary.totalChecks ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">Tier 1 Blockers</div>
            <div className="text-lg font-semibold">{execSummary.blockerCount}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">Compliance Gaps</div>
            <div className="text-lg font-semibold">{execSummary.gaps ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">Technical Gate</div>
            <div className="text-lg font-semibold">{execSummary.technicalGate ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">Release Recommendation</div>
            <div className="text-lg font-bold">{execSummary.recommendation}</div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="tech">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tech">
              <FileText className="h-4 w-4 mr-1" /> Technical Report
            </TabsTrigger>
            <TabsTrigger value="compliance">
              <Shield className="h-4 w-4 mr-1" /> Compliance Delta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tech" className="space-y-3">
            {!techReport ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Run the audit to see technical results</p>
            ) : (
              <div className="space-y-3">
                {techReport.journey_summaries?.map((j: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {j.all_passed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                      <span className="font-medium text-foreground">{j.name}</span>
                      <Badge variant="outline" className="text-xs">Tier {j.tier}</Badge>
                      {j.risk_types?.map((r: string) => (
                        <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {j.completed_steps?.length ?? 0}/{j.required_steps?.length ?? 0} steps
                    </span>
                  </div>
                ))}

                {/* Failed checks detail */}
                {techReport.results?.filter((r: any) => !r.passed).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Failed Checks</h4>
                    <div className="space-y-2">
                      {techReport.results.filter((r: any) => !r.passed).map((r: any, idx: number) => (
                        <div key={idx} className="text-sm border rounded p-2 bg-destructive/5">
                          <div className="flex items-center gap-2">
                            {r.is_blocker && <AlertTriangle className="h-3 w-3 text-destructive" />}
                            <span className="font-medium">[{r.journey}] {r.step}</span>
                          </div>
                          <p className="text-muted-foreground mt-1">{r.actual}</p>
                          {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compliance" className="space-y-3">
            {!compliance ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Run the audit to see compliance delta</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-sm">
                    <Badge variant="outline" className="cursor-pointer" onClick={() => setGapFilter("ALL")}>All ({compliance.rows.length})</Badge>
                    <Badge variant="outline" className="cursor-pointer text-green-700" onClick={() => setGapFilter("PASS")}>Pass ({compliance.summary.pass})</Badge>
                    <Badge variant="outline" className="cursor-pointer text-red-700" onClick={() => setGapFilter("GAP")}>Gap ({compliance.summary.gap})</Badge>
                    <Badge variant="outline" className="cursor-pointer text-yellow-700" onClick={() => setGapFilter("UNMAPPED")}>Unmapped ({compliance.summary.unmapped})</Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                </div>

                <div className="overflow-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b bg-muted/50">
                        <th className="py-2 px-3 font-medium text-foreground">COMAR Requirement</th>
                        <th className="py-2 px-3 font-medium text-foreground">System Behavior</th>
                        <th className="py-2 px-3 font-medium text-foreground">Gap?</th>
                        <th className="py-2 px-3 font-medium text-foreground">Recommended Fix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r, idx) => (
                        <tr key={idx} className="border-b align-top hover:bg-muted/30">
                          <td className="py-2 px-3 text-foreground">{r.comar_requirement}</td>
                          <td className="py-2 px-3 text-muted-foreground">{r.system_behavior}</td>
                          <td className={`py-2 px-3 ${gapStatusColor[r.gap_status]}`}>{r.gap_status}</td>
                          <td className="py-2 px-3 text-muted-foreground">{r.recommended_fix ?? "—"}</td>
                        </tr>
                      ))}
                      {filteredRows.length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No rows match filter</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
