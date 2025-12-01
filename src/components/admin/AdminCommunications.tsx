import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailAnalyticsDashboard } from '@/components/admin/EmailAnalyticsDashboard';
import { EmailTemplateManager } from '@/components/admin/EmailTemplateManager';
import { TestEmailSender } from '@/components/admin/TestEmailSender';

export const AdminCommunications = () => {
  return (
    <Tabs defaultValue="console" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="console">Email Console</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="test">Test Emails</TabsTrigger>
      </TabsList>

      <TabsContent value="console">
        <EmailAnalyticsDashboard />
      </TabsContent>

      <TabsContent value="templates">
        <EmailTemplateManager />
      </TabsContent>

      <TabsContent value="test">
        <TestEmailSender />
      </TabsContent>
    </Tabs>
  );
};
