import { RateLimitManager } from '@/components/admin/RateLimitManager';

export function SecurityTab() {
  return (
    <div className="space-y-6 py-6">
      <RateLimitManager />
    </div>
  );
}
