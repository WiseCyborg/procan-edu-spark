import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Settings, Smartphone, Mail, Zap, Shield, CheckCircle } from 'lucide-react';

export const VerificationPreferencesSetup: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isDispensaryManager } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [preferences, setPreferences] = useState({
    preferred_method: 'email',
    phone_number: '',
    backup_method: 'email'
  });
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [hasExistingPrefs, setHasExistingPrefs] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      // Get current profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profile) {
        setCurrentProfile(profile);
        setPreferences({
          preferred_method: profile.verification_method_preference || 'email',
          phone_number: profile.phone || '',
          backup_method: 'email'
        });
      }

      // Check for existing verification preferences
      const { data: existingPrefs } = await supabase
        .from('user_verification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (existingPrefs) {
        setHasExistingPrefs(true);
        setPreferences({
          preferred_method: existingPrefs.preferred_method,
          phone_number: existingPrefs.phone_number || '',
          backup_method: existingPrefs.backup_method
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    
    if (preferences.preferred_method !== 'email' && !preferences.phone_number) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number for SMS or WhatsApp verification",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile with phone and verification preference
      await supabase
        .from('profiles')
        .update({
          phone: preferences.phone_number || null,
          verification_method_preference: preferences.preferred_method
        })
        .eq('user_id', user.id);

      // Upsert verification preferences
      await supabase
        .from('user_verification_preferences')
        .upsert({
          user_id: user.id,
          preferred_method: preferences.preferred_method,
          phone_number: preferences.phone_number || null,
          backup_method: preferences.backup_method
        });

      toast({
        title: "Preferences Saved",
        description: "Your verification preferences have been updated successfully",
      });

      setHasExistingPrefs(true);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save verification preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestVerification = async () => {
    if (!preferences.phone_number && preferences.preferred_method !== 'email') {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to test SMS verification",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('vonage-verify-start', {
        body: {
          email: user?.email,
          phone: preferences.phone_number,
          delivery_method: preferences.preferred_method,
          purpose: 'login'
        }
      });

      if (error) {
        // Friendly fallback for missing Vonage credentials
        if (error.message?.includes('VONAGE') || error.message?.includes('credentials') || error.message?.includes('API')) {
          toast({
            title: "SMS Not Configured Yet",
            description: "SMS verification is not configured. Your preference has been saved and will work once SMS is enabled.",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Test Code Sent",
        description: `Verification test sent via ${preferences.preferred_method.toUpperCase()}`,
      });
    } catch (error: any) {
      console.error('Error testing verification:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test verification. Your preference has been saved.",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const isHighPrivilegeUser = isAdmin || isDispensaryManager;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Verification Preferences
          {isHighPrivilegeUser && (
            <Badge variant="default" className="ml-2">
              Priority User
            </Badge>
          )}
        </CardTitle>
        <p className="text-muted-foreground">
          Configure how you want to receive verification codes for secure access
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Admin Quick Entry Alert */}
        {isAdmin && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <Zap className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700">
              <strong>Admin Quick Entry:</strong> Enable SMS for instant PIN-based login without email verification.
            </AlertDescription>
          </Alert>
        )}

        {/* Primary Verification Method */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Primary Verification Method</Label>
          <RadioGroup
            value={preferences.preferred_method}
            onValueChange={(value) => setPreferences(prev => ({ ...prev, preferred_method: value }))}
          >
            <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50">
              <RadioGroupItem value="email" id="email" />
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="email" className="font-medium">Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receive codes via email (always available)
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50">
              <RadioGroupItem value="sms" id="sms" />
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <Label htmlFor="sms" className="font-medium">SMS Text</Label>
                <p className="text-sm text-muted-foreground">
                  Fast delivery via text message
                  {isAdmin && <span className="text-emerald-600 font-medium"> (Enables Quick Entry)</span>}
                </p>
              </div>
              {isAdmin && <Zap className="w-4 h-4 text-emerald-600" />}
            </div>
          </RadioGroup>
        </div>

        {/* Phone Number Input */}
        {preferences.preferred_method !== 'email' && (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={preferences.phone_number}
              onChange={(e) => setPreferences(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="+1234567890"
              className="text-base"
            />
            <p className="text-sm text-muted-foreground">
              Include country code (e.g., +1 for US/Canada)
            </p>
          </div>
        )}

        {/* Security Note */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your verification preferences enhance security while improving your login experience. 
            Email verification remains available as a backup method.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSavePreferences}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
            {hasExistingPrefs && <CheckCircle className="w-4 h-4 ml-2" />}
          </Button>

          {preferences.preferred_method !== 'email' && preferences.phone_number && (
            <Button
              variant="outline"
              onClick={handleTestVerification}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test'}
            </Button>
          )}
        </div>

        {/* Current Status */}
        {hasExistingPrefs && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>
                Preferences configured for {preferences.preferred_method.toUpperCase()} verification
                {isAdmin && preferences.preferred_method === 'sms' && (
                  <span className="text-emerald-600 font-medium"> with Quick Entry enabled</span>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};