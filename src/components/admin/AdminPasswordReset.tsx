import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Search, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff, Copy } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  organization_name: string | null;
}

export const AdminPasswordReset: React.FC = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const { toast } = useToast();

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    
    setSearching(true);
    setUserInfo(null);
    setResetSuccess(false);
    
    try {
      // Search in profiles by email_cache
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          email_cache,
          organization_id,
          organizations(name)
        `)
        .eq('email_cache', searchEmail.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        toast({
          title: "User Not Found",
          description: "No user found with this email address.",
          variant: "destructive",
        });
        return;
      }

      // Get user role separately
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      setUserInfo({
        id: profile.user_id,
        email: profile.email_cache || '',
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: roleData?.role || null,
        organization_name: profile.organizations?.name || null,
      });
    } catch (error) {
      console.error('Error searching user:', error);
      toast({
        title: "Search Error",
        description: "Failed to search for user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const resetPassword = async () => {
    if (!userInfo || !newPassword) return;
    
    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setResetting(true);
    
    try {
      // Call edge function to reset password (requires service role)
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          user_id: userInfo.id,
          new_password: newPassword
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to reset password');
      }

      setResetSuccess(true);
      toast({
        title: "Password Reset",
        description: `Password has been reset for ${userInfo.email}`,
      });

      // Log the action
      await supabase.from('security_audit_log').insert({
        user_id: userInfo.id,
        table_name: 'auth.users',
        action_type: 'ADMIN_PASSWORD_RESET',
        new_values: { reset_by_admin: true },
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Reset Error",
        description: error instanceof Error ? error.message : "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    toast({
      title: "Copied",
      description: "Password copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Password Reset
        </CardTitle>
        <CardDescription>
          Manually reset a user's password. The user should change this password after logging in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Section */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search-email" className="sr-only">Search by Email</Label>
            <Input
              id="search-email"
              type="email"
              placeholder="Enter user's email address"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
            />
          </div>
          <Button onClick={searchUser} disabled={searching || !searchEmail.trim()}>
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* User Info Display */}
        {userInfo && (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="font-medium">
                  {userInfo.first_name} {userInfo.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="font-medium">{userInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Role:</span>
                <span className="font-medium capitalize">{userInfo.role || 'N/A'}</span>
              </div>
              {userInfo.organization_name && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Organization:</span>
                  <span className="font-medium">{userInfo.organization_name}</span>
                </div>
              )}
            </div>

            {resetSuccess ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Password has been reset. Please share the new password securely with the user.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    This action will immediately change the user's password. They will need to use the new password to log in.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {newPassword && (
                      <Button variant="outline" size="icon" onClick={copyPassword}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={generateTempPassword}>
                      Generate Temporary Password
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={resetPassword} 
                  disabled={resetting || !newPassword || newPassword.length < 8}
                  className="w-full"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};