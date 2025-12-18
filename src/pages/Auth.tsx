
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SmartAuthForm from '@/components/auth/SmartAuthForm';
import DispensaryAuthForm from '@/components/auth/DispensaryAuthForm';
import StudentAuthForm from '@/components/auth/StudentAuthForm';
import AdminAuthForm from '@/components/auth/AdminAuthForm';
import DispensaryManagerAuthForm from '@/components/auth/DispensaryManagerAuthForm';
import { PasswordReset } from '@/components/auth/PasswordReset';
import { Mail, Key, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';

// Join Code Entry Component (Registration Only - No Login)
const JoinCodeEntry = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!joinCode.trim() || joinCode.length < 6) {
      toast.error('Please enter a valid join code');
      return;
    }
    
    setLoading(true);
    // Navigate to registration with join code pre-filled
    navigate(`/auth?role=student&register=true&code=${joinCode.toUpperCase()}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="joinCode">Organization Join Code</Label>
        <Input
          id="joinCode"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter code (e.g., JOIN-20251201-ABC123)"
          className="uppercase mt-1"
          maxLength={24}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Your manager should have provided this code
        </p>
      </div>
      
      <Button 
        onClick={handleContinue} 
        className="w-full"
        disabled={loading || joinCode.length < 6}
      >
        Continue to Registration
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <button 
            onClick={() => navigate('/auth?role=student')}
            className="text-primary hover:underline"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const mode = searchParams.get('mode');
  const prefilledCode = searchParams.get('code');
  const forceRegister = searchParams.get('register') === 'true';

  // Handle password reset mode
  if (mode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <PasswordReset />
      </div>
    );
  }

  // Employee/Student auth with proper tab separation
  if (role === 'student' || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Training Portal</CardTitle>
            <CardDescription>Sign in or register for your organization's training</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={prefilledCode ? 'code' : 'invite'} className="w-full">
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
                  If you received an email invitation, click the link in your email. 
                  Otherwise, sign in below.
                </div>
                <StudentAuthForm />
              </TabsContent>
              
              <TabsContent value="code" className="mt-4">
                <div className="text-center mb-4 text-sm text-muted-foreground">
                  Enter the join code provided by your manager to register
                </div>
                <JoinCodeEntry />
              </TabsContent>
            </Tabs>
            
            {/* Role routing info */}
            <div className="mt-6 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your dashboard will open automatically based on your role after signing in.
              </p>
            </div>
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
