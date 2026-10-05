/** A pasted URL is required only when the pipeline has not registered one. */
export function candidateUrlRequired(candidateRegistered: boolean | null | undefined): boolean {
  return !candidateRegistered;
}

export interface RegenerationStageInput {
  pipeline_stage: string | null;
  render_status: string | null;
  candidate_registered: boolean | null;
  candidate_stored_in_r2: boolean | null;
  playback_verified: boolean | null;
}

const STAGE_LABEL: Record<string, string> = {
  script_pending_review: "Script pending review",
  script_approved: "Script approved",
  render_collected: "Candidate URL recorded — not stored in R2 yet",
  r2_verified: "Replacement stored in R2",
  mapped: "Mapped to the module",
  playback_verified: "Playback verified",
  published: "Published",
};

/** Label taken from the asset's stored regeneration stage, never inferred. */
export function regenerationStageLabel(row: RegenerationStageInput): string {
  const stage = row.pipeline_stage?.trim() || "";
  if (!stage) return "Regeneration stage not recorded";
  const known = STAGE_LABEL[stage];
  if (known) return known;
  return stage.split("_").join(" ");
}

export function playbackLabel(playbackVerified: boolean | null | undefined): string {
  return playbackVerified ? "Playback verified" : "Playback not verified";
}

export const STORAGE_KEYS_BLOCK = "Blocked: storage keys";
export const SCRIPT_CREDITS_BLOCK = "Blocked: script credits";

export interface QueueBlockInput {
  module_number: number | null;
  has_draft_script: boolean | null;
  review_status: string | null;
  pipeline_stage: string | null;
  candidate_stored_in_r2: boolean | null;
  pipeline_last_error: string | null;
  render_error: string | null;
  job_last_error: string | null;
  narration_error?: string | null;
  render_job_error?: string | null;
}

function combinedError(row: QueueBlockInput): string {
  return [
    row.job_last_error,
    row.narration_error,
    row.render_job_error,
    row.pipeline_last_error,
    row.render_error,
  ]
    .filter((part) => part && part.trim())
    .join(" ")
    .toLowerCase();
}

/** Plain blocker labels. Only the ones that apply to this row are returned. */
export function queueBlockers(row: QueueBlockInput): string[] {
  const blocks: string[] = [];
  const err = combinedError(row);
  const scriptMissing = !row.has_draft_script && row.review_status !== "approved";
  if (scriptMissing || /credit balance|too low to access the anthropic/.test(err)) {
    blocks.push(SCRIPT_CREDITS_BLOCK);
  }
  if (/signaturedoesnotmatch|r2_config_incomplete|r2_put_failed|r2_head_failed/.test(err)) {
    blocks.push(STORAGE_KEYS_BLOCK);
  }
  return blocks;
}

/** One queue-level line. Storage is blocked when no replacement is in R2. */
export function queueWideBlockers(rows: QueueBlockInput[]): string[] {
  const blocks: string[] = [];
  if (rows.some((row) => queueBlockers(row).includes(SCRIPT_CREDITS_BLOCK))) {
    blocks.push(SCRIPT_CREDITS_BLOCK);
  }
  if (rows.length > 0 && rows.every((row) => !row.candidate_stored_in_r2)) {
    blocks.push(STORAGE_KEYS_BLOCK);
  }
  return blocks;
}

export function jobStatusLabel(row: {
  job_type: string | null;
  job_status: string | null;
  job_held: boolean | null;
}): string {
  if (!row.job_type && !row.job_status) return "No video job";
  const held = row.job_held ? " · held" : "";
  return `${row.job_type || "video job"} · ${row.job_status || "unknown"}${held}`;
}

export function showApproveScript(reviewStatus: string | null | undefined): boolean {
  return reviewStatus !== "approved";
}

/** A new narration job is offered only after the latest narration job has failed. */
export function showRequeueNarration(narrationStatus: string | null | undefined): boolean {
  return (narrationStatus ?? "").toLowerCase() === "failed";
}

export interface PriorityTier {
  rank: number;
  label: string;
}

/**
 * Tier 1 is the active-falsehood set William named: modules 7, 16, 18, 20, and 17.
 * Other tiers are read from a leading "TIER n" in the stored flag reason.
 */
export function priorityTier(moduleNumber: number | null, reason: string | null | undefined): PriorityTier {
  if (moduleNumber === 17 || /^TIER\s+1\b/i.test(reason ?? "")) {
    return { rank: 1, label: "Tier 1" };
  }
  const match = (reason ?? "").match(/^TIER\s+(\d+)\b/i);
  if (match) {
    return { rank: Number(match[1]), label: `Tier ${match[1]}` };
  }
  return { rank: 9, label: "Not tiered" };
}

export function compareQueueRows(
  a: { module_number: number | null; course_title?: string | null; reason?: string | null },
  b: { module_number: number | null; course_title?: string | null; reason?: string | null },
): number {
  const tier = priorityTier(a.module_number, a.reason).rank - priorityTier(b.module_number, b.reason).rank;
  if (tier !== 0) return tier;
  const moduleDelta = (a.module_number ?? 9999) - (b.module_number ?? 9999);
  if (moduleDelta !== 0) return moduleDelta;
  return (a.course_title ?? "").localeCompare(b.course_title ?? "");
}

export type StepState = "done" | "current" | "failed" | "waiting";

export interface StepView {
  key: string;
  label: string;
  state: StepState;
  detail: string;
}

function jobState(status: string | null | undefined): StepState {
  const value = (status ?? "").toLowerCase();
  if (!value) return "waiting";
  if (["completed", "succeeded", "success", "done"].includes(value)) return "done";
  if (["failed", "error", "dead", "cancelled", "canceled"].includes(value)) return "failed";
  return "current";
}

/** Short status William can scan: queued, running, failed with the error, or done. */
export function formatJobDetail(
  status: string | null | undefined,
  held: boolean | null | undefined,
  error: string | null | undefined,
): string {
  const value = (status ?? "").toLowerCase();
  if (!value) return "not started";
  const label = ["completed", "succeeded", "success", "done"].includes(value)
    ? "done"
    : value === "in_progress" || value === "processing"
      ? "running"
      : value;
  const heldNote = held ? ", held" : "";
  if (jobState(value) === "failed") {
    const code = (error ?? "").split("|")[0].trim();
    return code ? `${label}${heldNote}: ${code}` : `${label}${heldNote}`;
  }
  return `${label}${heldNote}`;
}

export interface RegenerationStepsInput {
  review_status: string | null;
  has_draft_script: boolean | null;
  render_status: string | null;
  candidate_stored_in_r2: boolean | null;
  mapped: boolean | null;
  playback_verified: boolean | null;
  replacement_published: boolean | null;
  narration_status: string | null;
  narration_held: boolean | null;
  narration_error: string | null;
  render_job_status: string | null;
  render_job_held: boolean | null;
  render_job_error: string | null;
}

export function regenerationSteps(row: RegenerationStepsInput): StepView[] {
  const scriptState: StepState =
    row.review_status === "approved"
      ? "done"
      : row.review_status === "rejected" || !row.has_draft_script
        ? "failed"
        : "current";
  const scriptDetail =
    row.review_status === "approved"
      ? "approved"
      : row.review_status === "script_pending_review"
        ? "pending review"
        : row.review_status || "missing";

  let renderState = jobState(row.render_job_status);
  let renderDetail = formatJobDetail(row.render_job_status, row.render_job_held, row.render_job_error);
  if (!row.render_job_status) {
    const assetStatus = (row.render_status ?? "").toLowerCase();
    if (assetStatus === "failed") {
      renderState = "failed";
      renderDetail = row.render_job_error ? formatJobDetail("failed", false, row.render_job_error) : "failed";
    } else if (["queued", "running", "processing", "collected"].includes(assetStatus)) {
      renderState = "current";
      renderDetail = assetStatus === "processing" ? "running" : assetStatus;
    } else {
      renderState = "waiting";
      renderDetail = "not started";
    }
  }

  return [
    { key: "script", label: "Script", state: scriptState, detail: scriptDetail },
    {
      key: "narration",
      label: "Narration",
      state: jobState(row.narration_status),
      detail: formatJobDetail(row.narration_status, row.narration_held, row.narration_error),
    },
    { key: "render", label: "Render", state: renderState, detail: renderDetail },
    {
      key: "r2",
      label: "R2 stored",
      state: row.candidate_stored_in_r2 ? "done" : "waiting",
      detail: row.candidate_stored_in_r2 ? "stored" : "not stored",
    },
    {
      key: "mapped",
      label: "Mapped",
      state: row.mapped ? "done" : "waiting",
      detail: row.mapped ? "mapped" : "not mapped",
    },
    {
      key: "playback",
      label: "Playback verified",
      state: row.playback_verified ? "done" : "waiting",
      detail: row.playback_verified ? "verified" : "not verified",
    },
    {
      key: "published",
      label: "Published",
      state: row.replacement_published ? "done" : "waiting",
      detail: row.replacement_published ? "published" : "not published",
    },
  ];
}

export interface QueueCountInput {
  review_status: string | null;
  narration_status: string | null;
  narration_held: boolean | null;
  render_job_status: string | null;
  candidate_stored_in_r2: boolean | null;
  playback_verified: boolean | null;
  replacement_published: boolean | null;
  module_number: number | null;
  reason: string | null;
}

export function queueSummary(rows: QueueCountInput[]): { label: string; value: number }[] {
  const count = (predicate: (row: QueueCountInput) => boolean) => rows.filter(predicate).length;
  return [
    { label: "Flagged", value: rows.length },
    { label: "Tier 1", value: count((row) => priorityTier(row.module_number, row.reason).rank === 1) },
    { label: "Script pending review", value: count((row) => row.review_status === "script_pending_review") },
    { label: "Script approved", value: count((row) => row.review_status === "approved") },
    { label: "Narration failed", value: count((row) => (row.narration_status ?? "").toLowerCase() === "failed") },
    { label: "Narration held", value: count((row) => !!row.narration_held) },
    { label: "Render job", value: count((row) => !!row.render_job_status) },
    { label: "Stored in R2", value: count((row) => !!row.candidate_stored_in_r2) },
    { label: "Playback verified", value: count((row) => !!row.playback_verified) },
    { label: "Published", value: count((row) => !!row.replacement_published) },
  ];
}
