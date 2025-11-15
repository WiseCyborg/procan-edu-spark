import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
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

    supabase.from('dispensary_applications').select('*').eq('registration_token', token).eq('application_status', 'approved').single()
      .then(({ data, error }) => {
        if (error || !data) { setValidationStatus('invalid'); return; }
        if (data.registration_completed) { setValidationStatus('used'); return; }
        if (new Date(data.registration_token_expires_at) < new Date()) { setValidationStatus('expired'); return; }
        setApplicationData(data);
        setValue('email', sanitizeEmail(data.contact_email));
        setValidationStatus('valid');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const onSubmit = async (data: FormData) => {
    try {
      const nameParts = applicationData.contact_person.trim().split(/\s+/);
      const { error: authError } = await supabase.auth.signUp({
        email: sanitizeEmail(data.email),
        password: data.password,
        options: { data: { first_name: nameParts[0], last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] } }
      });
      if (authError) throw authError;

      await supabase.from('dispensary_applications').update({ registration_completed: true }).eq('registration_token', token);
      
      toast({ title: "Account Created!", description: "Redirecting..." });
      setTimeout(() => navigate('/onboarding/wizard', { state: { applicationId: applicationData.id } }), 2000);
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
