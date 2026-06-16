// B1 — Filter UAT / E2E / smoke-test organizations from health-agent output.
// Apply to detector inputs so synthetic data does not inflate health metrics
// or fire admin alerts.
//
// Match rules (case-insensitive, name field only):
//   - starts with "UAT Test"
//   - starts with "E2E Test"
//   - starts with "Smoke Test"
//   - exact "ABC" (legacy placeholder repeatedly created during manual testing)
//
// If the rules grow, extend the regex here in ONE place.

const TEST_ORG_REGEX = /^(uat test|e2e test|smoke test)\b/i;

export function isTestOrg(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed.toUpperCase() === "ABC") return true;
  return TEST_ORG_REGEX.test(trimmed);
}

export function filterOutTestOrgs<T extends { name?: string | null; organization_name?: string | null }>(
  rows: T[] | null | undefined
): T[] {
  if (!rows) return [];
  return rows.filter((r) => !isTestOrg(r.name ?? r.organization_name ?? null));
}
