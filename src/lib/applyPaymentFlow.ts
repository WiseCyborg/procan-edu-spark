const APPLICATION_ID_STORAGE_KEY = 'procann.edu.application_id';

export function storeApplicationId(id: string | null | undefined): void {
  if (!id || typeof id !== 'string') return;
  try {
    sessionStorage.setItem(APPLICATION_ID_STORAGE_KEY, id);
  } catch {
    // Ignore quota / private-mode failures. The success screen still shows the id.
  }
}

export function readStoredApplicationId(): string | null {
  try {
    return sessionStorage.getItem(APPLICATION_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function extractApplicationId(...payloads: unknown[]): string | null {
  for (const payload of payloads) {
    if (!payload || typeof payload !== 'object') continue;
    const rec = payload as Record<string, unknown>;
    const id = rec.applicationId ?? rec.application_id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return null;
}

export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('://') || path.includes('\\')) return false;
  return true;
}

export function authContinueCopy(next: string | null | undefined): string | null {
  if (!next) return null;
  const path = next.split('?')[0];
  if (path === '/training-handbook') {
    return 'The Training Handbook is available after you sign in. This is not a public page.';
  }
  if (path === '/purchase-seats') {
    return 'Purchasing training seats requires a signed-in organization account. New organizations apply first. Payment is not collected until an application is approved.';
  }
  return 'Sign in to continue to the requested page.';
}

export function paymentPathForApplication(applicationId: string): string {
  return `/payment/${encodeURIComponent(applicationId)}`;
}
