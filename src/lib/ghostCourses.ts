/**
 * Hardcoded placeholder / ghost course IDs that must never appear in any
 * user-facing listing, count, progress bar, or completion metric.
 *
 * These rows exist in the DB but do not represent real, purchasable courses.
 * Do NOT delete the rows — just exclude them from display.
 *
 * NOTE: The two specialty certifications (Ganjier, Cannabis Sommelier) were
 * removed from this list — they are real, purchasable courses.
 */
export const GHOST_COURSE_IDS: readonly string[] = [] as const;

/** PostgREST `in.(...)` list literal for use with `.not('id', 'in', ...)` */
export const GHOST_COURSE_IDS_PG_LIST = `(${GHOST_COURSE_IDS.map((id) => `"${id}"`).join(',')})`;

/** Whether any ghost courses are currently configured. */
export const HAS_GHOST_COURSES = GHOST_COURSE_IDS.length > 0;

/** Filter an in-memory array of course-like objects to drop ghost courses. */
export function excludeGhostCourses<T extends { id?: string | null }>(rows: T[] | null | undefined): T[] {
  if (!rows) return [];
  if (!HAS_GHOST_COURSES) return rows;
  return rows.filter((r) => !!r.id && !GHOST_COURSE_IDS.includes(r.id as string));
}
