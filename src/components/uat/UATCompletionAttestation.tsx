import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, FileSignature, Shield, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AttestationChecklist {
  allTasksCompleted: boolean;
  paymentTestPassed: boolean;
  incidentTriggerTested: boolean;
  packetExportTested: boolean;
  employeeAccessVerified: boolean;
  rolePermissionsVerified: boolean;
}

interface UATCompletionAttestationProps {
  organizationId: string;
  onAttestationComplete?: () => void;
}

export const UATCompletionAttestation: React.FC<UATCompletionAttestationProps> = ({
  organizationId,
  onAttestationComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [checklist, setChecklist] = useState<AttestationChecklist>({
    allTasksCompleted: false,
    paymentTestPassed: false,
    incidentTriggerTested: false,
    packetExportTested: false,
    employeeAccessVerified: false,
    rolePermissionsVerified: false,
  });

  const allChecked = Object.values(checklist).every(Boolean);
  const canSign = allChecked && typedName.trim().length >= 3;

  const handleChecklistChange = (key: keyof AttestationChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmitAttestation = async () => {
    if (!canSign || !organizationId) return;

    setIsSubmitting(true);
    try {
      // Update organization with attestation
      const { error } = await supabase
        .from('organizations')
        .update({
          admin_attestation_signed: true,
          admin_attestation_signed_at: new Date().toISOString(),
          admin_attestation_signed_by: user?.id,
          uat_completed_at: new Date().toISOString(),
          ready_for_production: true,
        })
        .eq('id', organizationId);

      if (error) throw error;

      // Log the attestation in security audit
      await supabase.from('security_audit_log').insert({
        user_id: user?.id,
        action_type: 'uat_attestation_signed',
        table_name: 'organizations',
        record_id: organizationId,
        new_values: JSON.parse(JSON.stringify({
          attestation_checklist: checklist,
          typed_name: typedName,
          signed_at: new Date().toISOString(),
        })),
      });

      toast({
        title: 'UAT Attestation Signed',
        description: 'Your organization is now marked as production-ready.',
      });

      onAttestationComplete?.();
    } catch (error) {
      console.error('Failed to submit attestation:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit attestation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checklistItems = [
    { key: 'allTasksCompleted' as const, label: 'All UAT tasks have been completed and verified' },
    { key: 'paymentTestPassed' as const, label: 'PayPal sandbox payment test was successful' },
    { key: 'incidentTriggerTested' as const, label: 'Incident → retraining trigger has been tested' },
    { key: 'packetExportTested' as const, label: 'Employee compliance packet export works correctly' },
    { key: 'employeeAccessVerified' as const, label: 'All employees can login and access training' },
    { key: 'rolePermissionsVerified' as const, label: 'Role permissions function as expected' },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileSignature className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>UAT Completion Attestation</CardTitle>
            <CardDescription>
              Sign off on UAT completion to mark your organization as production-ready
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Checklist */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Pre-Production Verification Checklist
          </h4>
          <div className="space-y-3 pl-6">
            {checklistItems.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <Checkbox
                  id={item.key}
                  checked={checklist[item.key]}
                  onCheckedChange={() => handleChecklistChange(item.key)}
                />
                <Label 
                  htmlFor={item.key} 
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  {item.label}
                  {checklist[item.key] && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Signature */}
        <div className="space-y-3 border-t pt-4">
          <Label htmlFor="signature">Digital Signature (Type your full name)</Label>
          <Input
            id="signature"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Enter your full name to sign"
            className="font-signature text-lg"
          />
          <p className="text-xs text-muted-foreground">
            By signing, I attest that all UAT requirements have been completed satisfactorily
            and that our organization is ready for production use.
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Badge variant={allChecked ? 'default' : 'secondary'}>
              {Object.values(checklist).filter(Boolean).length} / {checklistItems.length} Complete
            </Badge>
            <span className="text-sm text-muted-foreground">
              {format(new Date(), 'MMMM d, yyyy')}
            </span>
          </div>
          <Button
            onClick={handleSubmitAttestation}
            disabled={!canSign || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <FileSignature className="h-4 w-4" />
                Sign Attestation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UATCompletionAttestation;
