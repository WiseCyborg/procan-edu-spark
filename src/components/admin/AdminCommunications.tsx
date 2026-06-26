import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailOpsConsole } from '@/components/admin/communications/EmailOpsConsole';
import { EmailTemplateManager } from '@/components/admin/EmailTemplateManager';
import { TestEmailSender } from '@/components/admin/TestEmailSender';
import { EmailLogsTable } from '@/components/admin/communications/EmailLogsTable';
import { EmailHealthPanel } from '@/components/admin/communications/EmailHealthPanel';
import { Activity, FileText, Send, Table, HeartPulse } from 'lucide-react';

export const AdminCommunications = () => {
  return (
    <Tabs defaultValue="health" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="health" className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4" />
          Health
        </TabsTrigger>
        <TabsTrigger value="ops" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Ops Console
        </TabsTrigger>
        <TabsTrigger value="templates" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Templates
        </TabsTrigger>
        <TabsTrigger value="logs" className="flex items-center gap-2">
          <Table className="h-4 w-4" />
          Email Logs
        </TabsTrigger>
        <TabsTrigger value="test" className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Test Emails
        </TabsTrigger>
      </TabsList>

      <TabsContent value="health" className="mt-4">
        <EmailHealthPanel />
      </TabsContent>

      <TabsContent value="ops" className="mt-4">
        <EmailOpsConsole />
      </TabsContent>

      <TabsContent value="templates" className="mt-4">
        <EmailTemplateManager />
      </TabsContent>

      <TabsContent value="logs" className="mt-4">
        <EmailLogsTable />
      </TabsContent>

      <TabsContent value="test" className="mt-4">
        <TestEmailSender />
      </TabsContent>
    </Tabs>
  );
};
