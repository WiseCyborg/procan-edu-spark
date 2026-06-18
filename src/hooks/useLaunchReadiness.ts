import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WelcomeIntroProbe {
  ok: boolean;
  method?: string;
  http_status?: number;
  content_type?: string | null;
  content_length?: string | null;
  resolved_url?: string;
  resolve_method?: string;
  latency_ms?: number;
  error_code?: string;
  error?: string;
}

export interface LastBatchRollup {
  run_batch: string;
  started_at: string;
  ended_at: string;
  total_routes: number;
  pass_count: number;
  warn_count: number;
  fail_count: number;
  rollup_status: "pass" | "warn" | "fail" | "unknown";
  welcome_intro_probe: WelcomeIntroProbe | null;
}

export interface UnmappedBreakdown {
  null_or_empty: number;
  placeholder: number;
  bad_format: number;
  dangling: number;
}

export interface ExclusionsBreakdown {
  null_or_empty: number;
  placeholder: number;
  bad_format: number;
}

export interface ExclusionRow {
  id: string;
  title: string;
  course: string | null;
  module_number: number | null;
  reason: string;
  video_url: string | null;
}

export type TrustCheck = "ok" | "suspicious_zero" | "out_of_band";

export interface ReadinessSnapshot {
  unmapped_modules: number;
  unmapped_modules_hardened: boolean;
  unmapped_breakdown?: UnmappedBreakdown;
  accepted_exclusions?: number;
  exclusions_breakdown?: ExclusionsBreakdown;
  exclusion_rows?: ExclusionRow[];
  trust_check?: TrustCheck;
  trust_baseline?: { min: number; max: number; note: string };
  duplicate_videos: number;
  orphan_video_assets: number;
  welcome_intro_db_row_present: boolean;
  welcome_intro_resolved: boolean;
  welcome_intro_probe: WelcomeIntroProbe | null;
  last_batch: LastBatchRollup | null;
  total_active_modules: number;
  total_active_videos: number;
  total_active_courses: number;
  last_audit_run_at: string | null;
  generated_at: string;
}


export interface FailedCheck {
  check: string;
  reason: string;
}

export interface AuditRunRow {
  id: string;
  run_batch: string;
  route: string;
  url: string;
  http_status: number | null;
  status: string;
  rollup_status: "pass" | "warn" | "fail" | null;
  failed_checks: FailedCheck[] | null;
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
        .select("id, run_batch, route, url, http_status, status, rollup_status, failed_checks, screenshot_path, markdown_excerpt, findings, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as AuditRunRow[];
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
      if (!data?.success) {
        const code = data?.error_code ?? "audit failed";
        const details = data?.details ? ` (${JSON.stringify(data.details)})` : "";
        throw new Error(`${code}${details}`);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["launch-readiness"] });
    },
  });
};

// Plain-language descriptions of each heuristic check, surfaced as tooltips
// so reviewers don't mistake "found a substring" for "feature works".
export const CHECK_DESCRIPTIONS: Record<string, string> = {
  has_header: "Page markdown/HTML contains 'procann', 'navigation', or 'menu'. Does NOT verify the real Header component rendered or is visible.",
  has_language_switcher: "Page contains the words 'language', 'english', 'español', or '中文'. Does NOT click the switcher or verify locale changes.",
  has_password_eye_icon: "On /auth, page contains 'eye', 'show password', or 'toggle password'. Does NOT verify the icon SVG renders or toggles.",
  has_vimeo_iframe: "Page contains 'player.vimeo.com' or 'vimeo.com/video'. Does NOT verify the video loads, plays, or has correct id.",
  has_hardcoded_iframe: "Page contains a literal <iframe src=...> tag. Informational — not scored.",
  http_status: "Firecrawl received a 2xx response from the route.",
  scrape: "Firecrawl reached the page at all.",
  welcome_intro_probe: "HEAD/Range-GET on the resolved welcome-intro asset URL returned 2xx.",
};

export const NOT_CHECKED = [
  "Visual layout / clipped CTAs — Firecrawl reads the DOM only. A 'Get Started' button clipped by overflow:hidden still passes every check. Review the screenshot manually.",
  "Video playback — we verify the asset URL returns 2xx, not that the player renders or playback starts. Manual smoke test required.",
  "Interactive behavior — language switcher, password-eye, modals are detected as text/markup presence only. We do not click.",
  "Lazy-loaded content past the 1500ms waitFor window is invisible to these checks.",
  "Unmapped-modules hardened detection (placeholders / format violations) is pending Louis's video_url storage convention.",
];
