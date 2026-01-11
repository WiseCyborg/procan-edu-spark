
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
import AccessKeyEntry from '@/components/auth/AccessKeyEntry';
import { PasswordReset } from '@/components/auth/PasswordReset';
import { Mail, Key, ArrowRight, Info, Building2 } from 'lucide-react';
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
  const navigate = useNavigate();
  const role = searchParams.get('role');
  const mode = searchParams.get('mode');
  const tabParam = searchParams.get('tab');
  const prefilledCode = searchParams.get('code');
  const forceRegister = searchParams.get('register') === 'true';
  const logoutReason = searchParams.get('reason');

  // Determine default tab based on URL params
  const getDefaultTab = () => {
    if (tabParam === 'accesskey') return 'accesskey';
    if (tabParam === 'code' || prefilledCode) return 'code';
    return 'invite';
  };

  // Inactivity logout banner
  const InactivityBanner = () => {
    if (logoutReason !== 'inactive') return null;
    
    return (
      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          You were signed out due to inactivity. Please sign in again to continue.
        </p>
      </div>
    );
  };

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
            <InactivityBanner />
            <Tabs defaultValue={getDefaultTab()} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invite" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Email</span> Invite
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Key className="h-4 w-4" />
                  <span className="hidden sm:inline">Join</span> Code
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
                  {prefilledCode && !prefilledCode.startsWith(':')
                    ? 'Complete your registration below'
                    : 'Enter the join code provided by your manager to register'}
                </div>
                {/* If code is prefilled (and not a template placeholder), show registration form. Otherwise show code entry */}
                {prefilledCode && forceRegister && !prefilledCode.startsWith(':') ? (
                  <StudentAuthForm />
                ) : (
                  <JoinCodeEntry />
                )}
              </TabsContent>
            </Tabs>
            
            {/* Role routing info */}
            <div className="mt-6 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your dashboard will open automatically based on your role after signing in.
              </p>
            </div>
            
            {/* Manager access key link */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Are you a <strong>Dispensary Manager</strong> with an access key?{' '}
                <button 
                  onClick={() => navigate('/auth?role=dispensary_manager&tab=accesskey')}
                  className="text-primary hover:underline"
                >
                  Register here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Dispensary Manager auth with Access Key
  if (role === 'dispensary_manager') {
    const showAccessKey = tabParam === 'accesskey';
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Manager Portal</CardTitle>
            <CardDescription>
              {showAccessKey 
                ? 'Enter your organization access key to complete registration' 
                : 'Sign in to manage your organization\'s training'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InactivityBanner />
            {showAccessKey ? (
              <>
                <div className="text-center mb-4 text-sm text-muted-foreground">
                  Your access key was sent in your approval email (format: DISP-YYYY-XXXXXXXX)
                </div>
                <AccessKeyEntry />
              </>
            ) : (
              <DispensaryManagerAuthForm />
            )}
            
            {/* Toggle between modes */}
            <div className="mt-6 text-center space-y-2">
              {showAccessKey ? (
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button 
                    onClick={() => navigate('/auth?role=dispensary_manager')}
                    className="text-primary hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Have an access key?{' '}
                  <button 
                    onClick={() => navigate('/auth?role=dispensary_manager&tab=accesskey')}
                    className="text-primary hover:underline"
                  >
                    Register with access key
                  </button>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Looking to register as an employee?{' '}
                <button 
                  onClick={() => navigate('/auth')}
                  className="text-primary hover:underline"
                >
                  Go to employee registration
                </button>
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
      default:
        return <SmartAuthForm />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="w-full max-w-lg">
        <InactivityBanner />
        {renderAuthForm()}
      </div>
    </div>
  );
};

export default Auth;
