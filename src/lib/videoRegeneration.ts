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
}

function combinedError(row: QueueBlockInput): string {
  return [row.job_last_error, row.pipeline_last_error, row.render_error]
    .filter((part) => part && part.trim())
    .join(" ")
    .toLowerCase();
}

/** Plain blocker labels. Only the ones that apply to this row are returned. */
export function queueBlockers(row: QueueBlockInput): string[] {
  const blocks: string[] = [];
  const err = combinedError(row);
  const scriptNotReady =
    !row.has_draft_script ||
    row.review_status === "script_pending_review" ||
    row.review_status === "rejected" ||
    row.pipeline_stage === "script_pending_review";
  const proposedDraftOutstanding =
    row.module_number != null &&
    row.module_number >= 24 &&
    row.module_number <= 29 &&
    !row.candidate_stored_in_r2;
  if (scriptNotReady || proposedDraftOutstanding || /credit balance|too low to access the anthropic/.test(err)) {
    blocks.push(SCRIPT_CREDITS_BLOCK);
  }
  if (!row.candidate_stored_in_r2 || /signaturedoesnotmatch|r2_config_incomplete|r2_put_failed|r2_head_failed/.test(err)) {
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
