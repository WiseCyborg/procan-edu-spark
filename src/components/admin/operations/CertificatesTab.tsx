import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CertificateManagementView } from '@/components/admin/CertificateManagementView';

export function CertificatesTab() {
  return (
    <div className="space-y-6 py-6">
      <CertificateManagementView />
    </div>
  );
}
