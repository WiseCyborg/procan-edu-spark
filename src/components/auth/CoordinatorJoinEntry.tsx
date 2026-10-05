import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2 } from 'lucide-react';

type JoinResult = {
  valid?: boolean;
  error_code?: string;
  error?: string;
  organizationName?: string;
};

type AccountMode = 'create' | 'signin';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

/**
 * A training coordinator gets in only with a join code the dispensary owner left active.
 * After that code is accepted, they create an account or sign in, and this page
 * links them to the organization as a training coordinator.
 */
export function CoordinatorJoinEntry() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshOrganization } = useOrganization();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);
  const [emptyAttempt, setEmptyAttempt] = useState(false);
  const [mode, setMode] = useState<AccountMode>('create');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const checkCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setEmptyAttempt(true);
      setResult(null);
      setFormError(null);
      return;
    }
    setEmptyAttempt(false);
    setFormError(null);
    setChecking(true);
    try {
      const { data, error } = await invokePublicFunction<JoinResult>('validate-join-code', {
        code: trimmed.toUpperCase(),
      });
      if (error || !data) {
        setResult({ valid: false, error_code: 'invalid', error: 'That join code is not valid.' });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ valid: false, error_code: 'invalid', error: 'That join code is not valid.' });
    } finally {
      setChecking(false);
    }
  };

  const ownerBlocked = result?.error_code === 'owner_not_allowed';
  const accepted = result?.valid === true && !!result.organizationName;

  const openDashboard = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@') || !password) {
      setFormError('Enter the email and password for this coordinator account.');
      return;
    }
    if (mode === 'create') {
      if (!firstName.trim() || !lastName.trim()) {
        setFormError('Enter your first and last name.');
        return;
      }
      if (!PASSWORD_RULE.test(password)) {
        setFormError('Password must be 8 or more characters and include an uppercase letter, a lowercase letter, a number, and a symbol.');
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (mode === 'create') {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            },
          },
        });
        if (error) {
          if (/already/i.test(error.message)) {
            setMode('signin');
            setFormError('An account with this email already exists. Sign in instead.');
            return;
          }
          throw error;
        }
        if (!data.session) {
          const signedIn = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });
          if (signedIn.error || !signedIn.data.session) {
            setFormError('The account was created, but sign-in did not finish. Sign in with the same email and password.');
            setMode('signin');
            return;
          }
        }
      } else {
        const signedIn = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signedIn.error || !signedIn.data.session) {
          setFormError('That email or password is not valid.');
          return;
        }
      }

      const { error: roleError } = await supabase.rpc(
        'complete_coordinator_entry' as never,
        { p_join_code: code.trim() } as never,
      );
      if (roleError) {
        const message = roleError.message || '';
        if (message.includes('owner_not_allowed')) {
          setFormError('The dispensary owner has not allowed coordinator entry.');
        } else {
          setFormError('That join code is not valid.');
        }
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.id) {
        await queryClient.invalidateQueries({ queryKey: ['user-roles', userData.user.id] });
      }
      await refreshOrganization();
      navigate('/training-coordinator-dashboard');
    } catch {
      setFormError('Coordinator entry could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Training coordinator entry</CardTitle>
        <CardDescription>
          Enter the join code from the dispensary owner. Entry stays closed until that owner allows it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={checkCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coordinator-join-code">Join code</Label>
            <Input
              id="coordinator-join-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setResult(null);
                setEmptyAttempt(false);
                setFormError(null);
              }}
              autoComplete="off"
              placeholder="Join code"
            />
          </div>
          <Button type="submit" className="w-full" disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
          </Button>
        </form>

        {emptyAttempt && (
          <Alert>
            <AlertDescription>Enter the join code from the dispensary owner.</AlertDescription>
          </Alert>
        )}

        {ownerBlocked && (
          <Alert>
            <AlertDescription>The dispensary owner has not allowed coordinator entry.</AlertDescription>
          </Alert>
        )}

        {result && !result.valid && !ownerBlocked && (
          <Alert>
            <AlertDescription>That join code is not valid.</AlertDescription>
          </Alert>
        )}

        {accepted && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Coordinator entry accepted for {result.organizationName}. Create an account or sign in to open the coordinator dashboard.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === 'create' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('create');
                  setFormError(null);
                }}
              >
                Create account
              </Button>
              <Button
                type="button"
                variant={mode === 'signin' ? 'default' : 'outline'}
                onClick={() => {
                  setMode('signin');
                  setFormError(null);
                }}
              >
                Sign in
              </Button>
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void openDashboard();
              }}
            >
              {mode === 'create' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="coordinator-first-name">First name</Label>
                    <Input
                      id="coordinator-first-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coordinator-last-name">Last name</Label>
                    <Input
                      id="coordinator-last-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="coordinator-email">Email</Label>
                <Input
                  id="coordinator-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coordinator-password">Password</Label>
                <Input
                  id="coordinator-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'create' ? (
                  'Create account and open dashboard'
                ) : (
                  'Sign in and open dashboard'
                )}
              </Button>
            </form>

            {formError && (
              <Alert>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
