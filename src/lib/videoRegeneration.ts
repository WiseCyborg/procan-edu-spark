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
