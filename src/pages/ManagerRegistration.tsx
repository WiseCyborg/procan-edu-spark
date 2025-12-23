import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { managerRegistrationSchema } from '@/lib/validation-schemas';
import { sanitizeEmail } from '@/lib/sanitization';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';
import type { z } from 'zod';

type FormData = z.infer<typeof managerRegistrationSchema>;

export default function ManagerRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [validationStatus, setValidationStatus] = useState<'validating' | 'valid' | 'invalid' | 'expired' | 'used'>('validating');
  const [applicationData, setApplicationData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(managerRegistrationSchema),
    mode: 'onBlur'
  });

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      setValidationStatus('invalid');
      setLoading(false);
      return;
    }

    // Use edge function for token validation with proper security
    invokePublicFunction('validate-manager-registration', {
      token
    }).then(({ data, error }) => {
      if (error || !data?.is_valid) {
        setValidationStatus(data?.error_message?.includes('expired') ? 'expired' : 
                           data?.error_message?.includes('completed') ? 'used' : 'invalid');
        setLoading(false);
        return;
      }

      // Use application data returned by edge function (no second query needed)
      if (!data.application_data) {
        setValidationStatus('invalid');
        setLoading(false);
        return;
      }

      setApplicationData(data.application_data);
      setValue('email', sanitizeEmail(data.application_data.contact_email));
      setValidationStatus('valid');
      setLoading(false);
    });
  }, [token, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const nameParts = applicationData.contact_person.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
      const sanitizedEmail = sanitizeEmail(data.email);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: data.password,
        options: { 
          emailRedirectTo: `${window.location.origin}/onboarding/setup-team?first_login=true`,
          data: { 
            firstName: firstName,
            lastName: lastName,
            registration_type: 'dispensary_manager'
          } 
        }
      });
      
      if (authError) throw authError;

      // Safety net: Ensure profile exists with organization_id
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            organization_id: applicationData.organization_id
          }, {
            onConflict: 'user_id'
          });
          
        if (profileError) {
          console.error('Profile creation error:', profileError);
          toast({ 
            title: "Warning", 
            description: "Profile setup incomplete. Please contact support if issues persist.", 
            variant: "destructive" 
          });
        }

        // Create dispensary_manager role entry
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'dispensary_manager'
          });
          
        if (roleError) {
          console.error('Role assignment error:', roleError);
          toast({ 
            title: "Warning", 
            description: "Role assignment incomplete. Please contact support.", 
            variant: "destructive" 
          });
        }
      }

      await supabase.from('dispensary_applications').update({ registration_completed: true }).eq('registration_token', token);
      
      toast({ title: "Account Created!", description: "Redirecting to setup..." });
      setTimeout(() => navigate('/onboarding/setup-team?first_login=true', { state: { applicationId: applicationData.id } }), 2000);
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (validationStatus !== 'valid') return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md"><CardHeader><XCircle className="h-6 w-6 text-destructive" /><CardTitle>Invalid Link</CardTitle></CardHeader>
        <CardContent><Button onClick={() => navigate('/')} className="w-full">Return Home</Button></CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CheckCircle2 className="h-6 w-6 text-green-600" /><CardTitle>Create Manager Account</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div><Label>Email</Label><Input type="email" disabled {...register('email')} /></div>
            <div><Label>Password *</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} {...register('password')} />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              <PasswordStrengthIndicator password={password || ''} />
            </div>
            <div><Label>Confirm Password *</Label>
              <div className="relative">
                <Input type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword')} />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
