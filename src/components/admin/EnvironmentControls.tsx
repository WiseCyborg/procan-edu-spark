import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings2, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from 'lucide-react';

type PayPalEnv = 'sandbox' | 'production';

export const EnvironmentControls = () => {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmLive, setConfirmLive] = useState(false);
  const [environment, setEnvironment] = useState<PayPalEnv>('sandbox');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedByLabel, setUpdatedByLabel] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('paypal_configuration')
        .select('environment, updated_at, updated_by')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.environment) {
        setEnvironment(data.environment as PayPalEnv);
        setUpdatedAt(data.updated_at ?? null);

        if (data.updated_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', data.updated_by)
            .maybeSingle();
          if (profile) {
            const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
            setUpdatedByLabel(name || data.updated_by);
          } else {
            setUpdatedByLabel(data.updated_by);
          }
        } else {
          setUpdatedByLabel(null);
        }
      } else {
        setEnvironment('sandbox');
        setUpdatedAt(null);
        setUpdatedByLabel(null);
      }
    } catch (err: any) {
      console.error('[EnvironmentControls] load error', err);
      toast.error('Failed to load PayPal mode', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyChange = async (target: PayPalEnv) => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-paypal-environment', {
        body: { environment: target },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to update environment');

      toast.success(`PayPal switched to ${target === 'production' ? 'LIVE' : 'SANDBOX'}`);
      await load();
    } catch (err: any) {
      console.error('[EnvironmentControls] update error', err);
      toast.error('Failed to change PayPal mode', { description: err.message });
    } finally {
      setUpdating(false);
      setConfirmLive(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    const target: PayPalEnv = checked ? 'production' : 'sandbox';
    if (target === environment) return;
    if (target === 'production') {
      setConfirmLive(true);
    } else {
      applyChange('sandbox');
    }
  };

  const isLive = environment === 'production';

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Environment Controls</CardTitle>
                  <CardDescription>Platform-wide payment environment toggles</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!loading && (
                  <Badge
                    className={
                      isLive
                        ? 'bg-green-600 hover:bg-green-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-500 text-white'
                    }
                  >
                    PayPal: {isLive ? 'LIVE' : 'SANDBOX'}
                  </Badge>
                )}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="paypal-mode" className="text-base font-medium">
                  PayPal Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isLive
                    ? 'LIVE — real payments will be processed.'
                    : 'SANDBOX — safe test mode, no real charges.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${!isLive ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  SANDBOX
                </span>
                <Switch
                  id="paypal-mode"
                  checked={isLive}
                  onCheckedChange={handleToggle}
                  disabled={loading || updating}
                />
                <span className={`text-sm font-medium ${isLive ? 'text-green-600' : 'text-muted-foreground'}`}>
                  LIVE
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {loading || updating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <>
                  <span>
                    Last updated:{' '}
                    {updatedAt ? new Date(updatedAt).toLocaleString() : 'never'}
                  </span>
                  {updatedByLabel && <span>· by {updatedByLabel}</span>}
                </>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={confirmLive} onOpenChange={(o) => !updating && setConfirmLive(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Switch PayPal to LIVE?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are switching PayPal to LIVE mode. Real money will be charged. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                applyChange('production');
              }}
              disabled={updating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updating ? 'Switching…' : 'Enable LIVE'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
