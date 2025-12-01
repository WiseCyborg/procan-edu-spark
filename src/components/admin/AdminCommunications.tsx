import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, FileText, Send } from 'lucide-react';
import { EmailAnalyticsDashboard } from '@/components/admin/EmailAnalyticsDashboard';

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Email Templates
            </CardTitle>
            <CardDescription>Manage and customize email templates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Email template editor coming soon
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="test">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Test Emails
            </CardTitle>
            <CardDescription>Test email delivery and formatting</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Test email interface coming soon
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
