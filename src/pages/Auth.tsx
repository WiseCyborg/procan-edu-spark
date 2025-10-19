
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SmartAuthForm from '@/components/auth/SmartAuthForm';
import DispensaryAuthForm from '@/components/auth/DispensaryAuthForm';
import StudentAuthForm from '@/components/auth/StudentAuthForm';
import AdminAuthForm from '@/components/auth/AdminAuthForm';
import DispensaryManagerAuthForm from '@/components/auth/DispensaryManagerAuthForm';
import { PasswordReset } from '@/components/auth/PasswordReset';
import { Mail, Key } from 'lucide-react';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const mode = searchParams.get('mode');

  // Handle password reset mode
  if (mode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <PasswordReset />
      </div>
    );
  }

  // Student/Employee signup should show dual-mode tabs
  if (role === 'student' || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign up under your dispensary or school account</CardTitle>
            <CardDescription>Choose how you want to register</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="invite" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invite" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Invite
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Join Code
                </TabsTrigger>
              </TabsList>
              <TabsContent value="invite" className="mt-4">
                <div className="text-center mb-4 text-sm text-muted-foreground">
                  If you received an email invitation, click the link in the email or enter your details below
                </div>
                <StudentAuthForm />
              </TabsContent>
              <TabsContent value="code" className="mt-4">
                <div className="text-center mb-4 text-sm text-muted-foreground">
                  Enter the dispensary join code provided by your manager
                </div>
                <StudentAuthForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Route to appropriate auth form based on role parameter
  const renderAuthForm = () => {
    switch (role) {
      case 'admin':
        return <AdminAuthForm />;
      case 'dispensary':
        return <DispensaryAuthForm />;
      case 'dispensary_manager':
        return <DispensaryManagerAuthForm />;
      default:
        return <SmartAuthForm />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      {renderAuthForm()}
    </div>
  );
};

export default Auth;
