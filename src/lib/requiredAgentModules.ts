/**
 * Buyer-required agent modules for Maryland Responsible Vendor Training.
 *
 * The course home count is get_course_state.required_total: active
 * course_modules for this course where is_manager_only is false.
 * That set is modules 0–18 and 24–29 (25). Modules 19–23 are the optional
 * supervisory track and are not part of this list, so they do not sit
 * between module 18 and module 24.
 */
export const REQUIRED_AGENT_MODULE_NUMBERS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  10, 11, 12, 13, 14, 15, 16, 17, 18,
  24, 25, 26, 27, 28, 29,
] as const;

export const MANAGER_MODULE_NUMBERS = [19, 20, 21, 22, 23] as const;

export const REQUIRED_AGENT_MODULE_COUNT = REQUIRED_AGENT_MODULE_NUMBERS.length;

const requiredSet = new Set<number>(REQUIRED_AGENT_MODULE_NUMBERS);

export function isRequiredAgentModule(moduleNumber: number): boolean {
  return requiredSet.has(moduleNumber);
}

export function isManagerTrackModule(moduleNumber: number): boolean {
  return (MANAGER_MODULE_NUMBERS as readonly number[]).includes(moduleNumber);
}

/** Order a learner walks. Students skip the supervisory track. */
export function learnerModulePath(includeManagerTrack: boolean): number[] {
  if (!includeManagerTrack) return [...REQUIRED_AGENT_MODULE_NUMBERS];
  return [
    ...REQUIRED_AGENT_MODULE_NUMBERS.filter((n) => n <= 18),
    ...MANAGER_MODULE_NUMBERS,
    ...REQUIRED_AGENT_MODULE_NUMBERS.filter((n) => n >= 24),
  ];
}

export function adjacentModule(
  moduleNumber: number,
  includeManagerTrack: boolean,
  direction: 'next' | 'previous',
): number | null {
  const path = learnerModulePath(includeManagerTrack);
  const index = path.indexOf(moduleNumber);
  if (index === -1) return null;
  const nextIndex = direction === 'next' ? index + 1 : index - 1;
  return path[nextIndex] ?? null;
}
