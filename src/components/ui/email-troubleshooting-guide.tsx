import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, Search, RefreshCw, Settings, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const EmailTroubleshootingGuide = () => {
  const troubleshootingSteps = [
    {
      id: "check-spam",
      title: "Check Your Spam/Junk Folder",
      icon: <Search className="h-4 w-4" />,
      content: (
        <div className="space-y-2">
          <p>Look for emails from:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Sender:</strong> ProCann Edu (via Supabase)</li>
            <li><strong>Subject contains:</strong> ProCann Edu, verification, password reset</li>
            <li><strong>Footer shows:</strong> "Powered by Supabase"</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            If found in spam, mark as "Not Spam" to ensure future delivery.
          </p>
        </div>
      )
    },
    {
      id: "verify-email",
      title: "Verify Your Email Address",
      icon: <Mail className="h-4 w-4" />,
      content: (
        <div className="space-y-2">
          <p>Ensure your email address is correct:</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Go to your Profile Settings</li>
            <li>Check the email address on file</li>
            <li>Look for typos or extra spaces</li>
            <li>Update if necessary and save changes</li>
          </ol>
        </div>
      )
    },
    {
      id: "request-new",
      title: "Request New Verification Email",
      icon: <RefreshCw className="h-4 w-4" />,
      content: (
        <div className="space-y-2">
          <p>You can request a new email from your dashboard:</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Click "Resend Verification Email" in your account panel</li>
            <li>Wait 2-3 minutes for delivery</li>
            <li>Check both inbox and spam folders</li>
            <li>Contact support if still not received after 10 minutes</li>
          </ol>
        </div>
      )
    },
    {
      id: "email-settings",
      title: "Check Email Provider Settings",
      icon: <Settings className="h-4 w-4" />,
      content: (
        <div className="space-y-2">
          <p>Some email providers have strict filtering:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Corporate emails:</strong> Ask IT to whitelist Supabase domains</li>
            <li><strong>Gmail:</strong> Check "Updates" and "Promotions" tabs</li>
            <li><strong>Outlook:</strong> Check "Clutter" and "Focused" inbox settings</li>
            <li><strong>Yahoo:</strong> Check "Bulk" folder</li>
          </ul>
        </div>
      )
    }
  ];

  const emailTypes = [
    {
      type: "Account Verification",
      description: "Sent immediately after registration",
      timing: "Within 1-2 minutes",
      action: "Click verification link to activate account"
    },
    {
      type: "Password Reset",
      description: "Sent when you request password reset",
      timing: "Within 1 minute",
      action: "Click reset link to set new password"
    },
    {
      type: "Course Completion",
      description: "Sent after completing modules or final exam",
      timing: "Within 5 minutes",
      action: "Confirmation of progress and next steps"
    },
    {
      type: "Certificate Generated",
      description: "Sent when certificate is ready for download",
      timing: "Within 2-3 minutes",
      action: "Download certificate from provided link"
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Delivery & Troubleshooting Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="font-semibold">Important:</span>
            </div>
            <p className="text-muted-foreground">
              All ProCann Edu emails are sent through <strong>Supabase's enterprise infrastructure</strong> 
              with 99.9% delivery reliability. If you're not receiving emails, follow the steps below.
            </p>
          </div>

          <Accordion type="single" collapsible>
            {troubleshootingSteps.map((step) => (
              <AccordionItem key={step.id} value={step.id}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    {step.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {step.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Expected Email Types & Timing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emailTypes.map((email, index) => (
              <div key={index} className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{email.type}</h4>
                  <Badge variant="outline">{email.timing}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{email.description}</p>
                <p className="text-sm font-medium">{email.action}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-green-50/50 dark:bg-green-900/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Still having issues?</strong> Contact our support team at{' '}
              <a href="mailto:info@procannedu.com" className="underline">info@procannedu.com</a>{' '}
              with your email address and we'll investigate delivery status.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};