import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedUserManagementView } from '@/components/admin/EnhancedUserManagementView';

export function UsersTab() {
  return (
    <div className="space-y-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage all platform users with advanced search and bulk operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedUserManagementView />
        </CardContent>
      </Card>
    </div>
  );
}
