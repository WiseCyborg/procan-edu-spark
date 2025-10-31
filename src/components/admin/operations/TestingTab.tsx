import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FastTrackTestPanel } from '@/components/admin/FastTrackTestPanel';
import { TestEmailSender } from '@/components/admin/TestEmailSender';
import TestAccountCreator from '@/components/admin/TestAccountCreator';

export function TestingTab() {
  return (
    <div className="space-y-6 py-6">
      <FastTrackTestPanel />
      
      <Card>
        <CardHeader>
          <CardTitle>Test Email Sender</CardTitle>
        </CardHeader>
        <CardContent>
          <TestEmailSender />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Account Creator</CardTitle>
        </CardHeader>
        <CardContent>
          <TestAccountCreator />
        </CardContent>
      </Card>
    </div>
  );
}
