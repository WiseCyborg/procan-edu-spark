
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { MFAVerification } from './MFAVerification';

const AuthForm = () => {
  const [loading, setLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaEmail, setMfaEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Smart authentication flow states
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [activeTab, setActiveTab] = useState('signup');
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  // Debounced email checking
  const checkEmailExists = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return;
    
    setEmailChecking(true);
    try {
      // Use password reset as a way to check if email exists without revealing account existence explicitly
      const { error } = await supabase.auth.resetPasswordForEmail(emailToCheck, {
        redirectTo: `${window.location.origin}/auth`
      });
      
      // If no error, email likely exists
      setEmailExists(!error);
      
      if (!error && emailExists !== true) {
        setActiveTab('signin');
        setShowWelcomeMessage(true);
        setTimeout(() => setShowWelcomeMessage(false), 3000);
      }
    } catch (error) {
      // Email probably doesn't exist
      setEmailExists(false);
    } finally {
      setEmailChecking(false);
    }
  }, [emailExists]);

  // Debounce email checking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email) {
        checkEmailExists(email);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [email, checkEmailExists]);

  // Reset email existence check when email changes significantly
  useEffect(() => {
    if (email.length < 3) {
      setEmailExists(null);
      setActiveTab('signup');
    }
  }, [email]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/welcome`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to complete your registration.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      // Show MFA verification after successful password verification
      setMfaEmail(email);
      setShowMFA(true);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleMFAVerified = () => {
    setShowMFA(false);
    toast({
      title: "Success",
      description: "Successfully signed in!",
    });
  };

  const handleMFACancel = () => {
    setShowMFA(false);
    // Sign out the user since they didn't complete MFA
    supabase.auth.signOut();
  };

  if (showMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <MFAVerification
          email={mfaEmail}
          purpose="login"
          onVerified={handleMFAVerified}
          onCancel={handleMFACancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-700">
            ProCann Edu
          </CardTitle>
          <p className="text-gray-600">Maryland Cannabis Training Platform</p>
        </CardHeader>
        <CardContent>
          {showWelcomeMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-md text-green-800 text-sm">
              Welcome back! We found your account.
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" disabled={emailExists === false}>
                Sign In
                {emailChecking && <span className="ml-1 text-xs">...</span>}
              </TabsTrigger>
              <TabsTrigger value="signup" disabled={emailExists === true}>
                Sign Up
                {emailExists === false && <span className="ml-1 text-xs text-green-600">•</span>}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
