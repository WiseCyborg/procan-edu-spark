/**
 * Hardcoded placeholder / ghost course IDs that must never appear in any
 * user-facing listing, count, progress bar, or completion metric.
 *
 * These rows exist in the DB but do not represent real, purchasable courses.
 * Do NOT delete the rows — just exclude them from display.
 */
export const GHOST_COURSE_IDS: readonly string[] = [
  '22222222-2222-4222-a222-222222222222', // Ganjier Certification
  '33333333-3333-4333-a333-333333333333', // Cannabis Sommelier Certification
] as const;

/** PostgREST `in.(...)` list literal for use with `.not('id', 'in', ...)` */
export const GHOST_COURSE_IDS_PG_LIST = `(${GHOST_COURSE_IDS.map((id) => `"${id}"`).join(',')})`;

/** Filter an in-memory array of course-like objects to drop ghost courses. */
export function excludeGhostCourses<T extends { id?: string | null }>(rows: T[] | null | undefined): T[] {
  if (!rows) return [];
  return rows.filter((r) => !!r.id && !GHOST_COURSE_IDS.includes(r.id as string));
}
