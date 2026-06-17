import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReadinessSnapshot {
  unmapped_modules: number;
  duplicate_videos: number;
  orphan_video_assets: number;
  welcome_intro_resolved: boolean;
  total_active_modules: number;
  total_active_videos: number;
  total_active_courses: number;
  last_audit_run_at: string | null;
  generated_at: string;
}

export interface AuditRunRow {
  id: string;
  run_batch: string;
  route: string;
  url: string;
  http_status: number | null;
  status: string;
  screenshot_path: string | null;
  markdown_excerpt: string | null;
  findings: Record<string, unknown>;
  created_at: string;
}

export const useReadinessSnapshot = (enabled: boolean) =>
  useQuery({
    queryKey: ["launch-readiness", "snapshot"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ReadinessSnapshot> => {
      const { data, error } = await supabase.functions.invoke("launch-readiness-snapshot", { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error_code ?? "snapshot failed");
      return data.snapshot as ReadinessSnapshot;
    },
  });

export const useAuditRuns = (enabled: boolean) =>
  useQuery({
    queryKey: ["launch-readiness", "runs"],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AuditRunRow[]> => {
      const { data, error } = await supabase
        .from("launch_audit_runs")
        .select("id, run_batch, route, url, http_status, status, screenshot_path, markdown_excerpt, findings, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AuditRunRow[];
    },
  });

export const useRunAudit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (routes?: string[]) => {
      const { data, error } = await supabase.functions.invoke("launch-audit-crawler", {
        body: routes ? { routes } : {},
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error_code ?? "audit failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["launch-readiness"] });
    },
  });
};
