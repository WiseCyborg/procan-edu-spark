import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';
import { Loader2 } from 'lucide-react';

type JoinResult = {
  valid?: boolean;
  error_code?: string;
  error?: string;
  organizationName?: string;
};

/**
 * A training coordinator gets in only with a join code the dispensary owner left active.
 * This page does not create an account.
 */
export function CoordinatorJoinEntry() {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);
  const [emptyAttempt, setEmptyAttempt] = useState(false);

  const checkCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setEmptyAttempt(true);
      setResult(null);
      return;
    }
    setEmptyAttempt(false);
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
              onChange={(event) => setCode(event.target.value)}
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
          <Alert>
            <AlertDescription>
              Coordinator entry accepted for {result.organizationName}.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
