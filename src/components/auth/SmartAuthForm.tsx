import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Shield, Smartphone, Mail, Zap } from 'lucide-react';
import { EnhancedMFAVerification } from './EnhancedMFAVerification';
import { ForgotPassword } from './ForgotPassword';
import { QuickPinEntry } from './QuickPinEntry';

const SmartAuthForm = () => {
  const [loading, setLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
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
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hasPreferences, setHasPreferences] = useState(false);

  // Check email and get user preferences
  const checkEmailExists = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) return;
    
    setEmailChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-email-exists', {
        body: { email: emailToCheck }
      });
      
      if (error) {
        console.error('Email check error:', error);
        setEmailExists(null);
        return;
      }
      
      setEmailExists(data.exists);
      
      if (data.exists) {
        setActiveTab('signin');
        
        // Check if user has verification preferences
        const { data: userData } = await supabase
          .from('profiles')
          .select('verification_method_preference, phone')
          .eq('user_id', data.user_id)
          .single();
          
        if (userData?.verification_method_preference === 'sms' && userData?.phone) {
          setHasPreferences(true);
          setPhone(userData.phone);
        }
        
        // Get user roles
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user_id);
          
        if (roles) {
          setUserRoles(roles.map(r => r.role));
        }
      }
    } catch (error) {
      console.error('Email check failed:', error);
      setEmailExists(null);
    } finally {
      setEmailChecking(false);
    }
  }, []);

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
      setUserRoles([]);
      setHasPreferences(false);
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
          description: "We sent you a confirmation link to complete your registration. Delivered through Supabase's enterprise infrastructure with 99.9% reliability.",
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

      // Smart verification flow based on user role and preferences
      const isAdmin = userRoles.includes('admin');
      
      if (isAdmin && hasPreferences) {
        // Quick PIN entry for admins with SMS preferences
        setShowQuickEntry(true);
      } else {
        // Standard MFA flow
        setMfaEmail(email);
        setShowMFA(true);
      }
      
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
    setShowQuickEntry(false);
    toast({
      title: "Success",
      description: "Successfully signed in!",
    });
  };

  const handleMFACancel = () => {
    setShowMFA(false);
    setShowQuickEntry(false);
    supabase.auth.signOut();
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <ForgotPassword onBack={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  if (showQuickEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <QuickPinEntry
          email={mfaEmail}
          phone={phone}
          onVerified={handleMFAVerified}
          onCancel={handleMFACancel}
        />
      </div>
    );
  }

  if (showMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <EnhancedMFAVerification
          email={mfaEmail}
          phone={phone}
          purpose="login"
          onVerified={handleMFAVerified}
          onCancel={handleMFACancel}
        />
      </div>
    );
  }

  const isAdmin = userRoles.includes('admin');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-3 md:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center p-4 md:p-6">
          <CardTitle className="text-xl md:text-2xl font-bold text-primary">
            ProCann Edu
          </CardTitle>
          <p className="text-sm md:text-base text-muted-foreground">Maryland Cannabis Training Platform</p>
          
          {emailExists && userRoles.length > 0 && (
            <div className="flex justify-center gap-1 flex-wrap mt-2">
              {userRoles.map(role => (
                <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                  {role.replace('_', ' ').toUpperCase()}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {isAdmin && hasPreferences && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
              <div className="flex items-center gap-2 text-emerald-700 text-sm">
                <Zap className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Quick Entry Available</span>
              </div>
              <p className="text-emerald-600 text-xs mt-1">
                SMS verification is enabled for faster admin access
              </p>
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 md:h-9">
              <TabsTrigger value="signin" disabled={emailExists === false} className="text-sm md:text-base">
                Sign In
                {emailChecking && <span className="ml-1 text-xs">...</span>}
              </TabsTrigger>
              <TabsTrigger value="signup" disabled={emailExists === true} className="text-sm md:text-base">
                Sign Up
                {emailExists === false && <span className="ml-1 text-xs text-primary">•</span>}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3 md:space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 md:h-10 text-base md:text-sm"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 md:h-10 text-base md:text-sm"
                    autoComplete="current-password"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 md:h-10 text-base md:text-sm"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                  {isAdmin && hasPreferences && (
                    <Zap className="w-4 h-4 ml-2 flex-shrink-0" />
                  )}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm md:text-base text-primary hover:underline min-h-[44px] md:min-h-0 flex items-center justify-center"
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-11 md:h-10 text-base md:text-sm"
                    autoComplete="given-name"
                  />
                  <Input
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-11 md:h-10 text-base md:text-sm"
                    autoComplete="family-name"
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 md:h-10 text-base md:text-sm"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Phone Number (Required for SMS verification)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="h-11 md:h-10 text-base md:text-sm"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 md:h-10 text-base md:text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 md:h-10 text-base md:text-sm"
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

export default SmartAuthForm;