import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Shield } from 'lucide-react';

const DispensaryManagerAuthForm = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleManagerLogin = async (e: React.FormEvent) => {
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
        return;
      }

      toast({
        title: "Welcome back",
        description: "Successfully signed in to dispensary portal.",
      });
      
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-green-600" />
            <CardTitle className="text-2xl font-bold text-green-700">
              Dispensary Portal
            </CardTitle>
          </div>
          <p className="text-muted-foreground">Management access for dispensary operations</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Manager Access</h3>
            </div>
            <p className="text-sm text-green-700">
              Sign in with your dispensary manager credentials to access employee training management.
            </p>
          </div>

          <form onSubmit={handleManagerLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Manager Email"
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
              {loading ? 'Signing In...' : 'Sign In to Portal'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-gray-600">
              Need help accessing your account?
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Contact your system administrator or support team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispensaryManagerAuthForm;