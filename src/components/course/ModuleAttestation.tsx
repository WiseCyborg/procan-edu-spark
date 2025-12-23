import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, FileCheck, AlertTriangle } from 'lucide-react';

interface ModuleAttestationProps {
  moduleId: string;
  courseId: string;
  moduleTitle: string;
  onAttestationComplete?: () => void;
  required?: boolean;
}

const ATTESTATION_TEXT = `I acknowledge that I have thoroughly reviewed and understand the material presented in this module. I understand this training is required for Maryland cannabis compliance and that I am responsible for applying this knowledge in my work.`;

export const ModuleAttestation: React.FC<ModuleAttestationProps> = ({
  moduleId,
  courseId,
  moduleTitle,
  onAttestationComplete,
  required = true,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAttestation, setExistingAttestation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingAttestation();
  }, [moduleId, user]);

  const checkExistingAttestation = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('module_attestations')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .single();

      if (data && !error) {
        setExistingAttestation(data);
      }
    } catch (error) {
      // No existing attestation, which is fine
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAttestation = async () => {
    if (!user || !isChecked) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('module_attestations')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          course_id: courseId,
          attestation_text: ATTESTATION_TEXT,
          attested_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,module_id',
        });

      if (error) throw error;

      toast({
        title: 'Attestation Recorded',
        description: 'Your understanding of this module has been documented.',
      });

      setExistingAttestation({ attested_at: new Date().toISOString() });
      onAttestationComplete?.();
    } catch (error: any) {
      console.error('Error recording attestation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record attestation',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Already attested
  if (existingAttestation) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">
                Module Understanding Confirmed
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                Attested on {new Date(existingAttestation.attested_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="outline" className="ml-auto border-green-500 text-green-700">
              <FileCheck className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={required ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/30' : ''}>
      <CardContent className="p-4 space-y-4">
        {required && (
          <Alert variant="default" className="border-orange-300 bg-orange-100 dark:bg-orange-900/30">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-300">
              You must acknowledge your understanding of this module before proceeding to the quiz.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">
            Module: <span className="text-muted-foreground">{moduleTitle}</span>
          </p>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground italic">
              "{ATTESTATION_TEXT}"
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="attestation"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
              className="mt-1"
            />
            <Label htmlFor="attestation" className="text-sm cursor-pointer">
              I have read and understand the above statement
            </Label>
          </div>
        </div>

        <Button
          onClick={handleSubmitAttestation}
          disabled={!isChecked || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            'Recording Attestation...'
          ) : (
            <>
              <FileCheck className="h-4 w-4 mr-2" />
              Confirm Understanding
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
