/** Maryland Responsible Vendor Training. The full lesson player lives at /course. */
export const RVT_COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

/** Where a buyer goes after a course payment is confirmed. */
export function paidCourseEntryPath(courseId: string): string {
  if (courseId === RVT_COURSE_ID) return '/course';
  return `/courses/${courseId}/learn`;
}
