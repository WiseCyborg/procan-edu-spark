import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, FileText, Contact, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { dispensaryApplicationSchema } from '@/lib/validation-schemas';
import { sanitizeFormData } from '@/lib/sanitization';
import { PhoneInput } from '@/components/ui/phone-input';
import type { z } from 'zod';

type FormData = z.infer<typeof dispensaryApplicationSchema>;

const DispensaryApplication = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    trigger
  } = useForm<FormData>({
    resolver: zodResolver(dispensaryApplicationSchema),
    mode: 'onBlur',
    defaultValues: {
      organizationName: '',
      legalEntityName: '',
      dbaName: '',
      licenseType: 'dispensary',
      licenseNumber: '',
      licenseIssueDate: '',
      licenseExpiryDate: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      estimatedEmployees: 1,
      preferredStartDate: '',
      complianceAffirmation: false,
      privacyAcknowledgment: false,
      trainingResponsibility: false
    }
  });

  const formValues = watch();

  const onSubmit = async (data: FormData) => {
    const sanitizedData = sanitizeFormData(data);
    
    try {
      const { data: insertedApp, error: insertError } = await supabase
        .from('dispensary_applications')
        .insert({
          organization_name: sanitizedData.organizationName,
          legal_entity_name: sanitizedData.legalEntityName,
          dba_name: sanitizedData.dbaName || sanitizedData.organizationName,
          license_type: sanitizedData.licenseType,
          license_number: sanitizedData.licenseNumber,
          license_issue_date: sanitizedData.licenseIssueDate || null,
          license_expiry_date: sanitizedData.licenseExpiryDate || null,
          contact_person: sanitizedData.contactPerson,
          contact_email: sanitizedData.contactEmail,
          contact_phone: sanitizedData.contactPhone,
          address: sanitizedData.address,
          estimated_employees: sanitizedData.estimatedEmployees || null,
          preferred_start_date: sanitizedData.preferredStartDate || null,
          compliance_affirmation: true,
          application_status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setSubmitted(true);

      toast({
        title: "Application Submitted! ✅",
        description: `Your application has been received. We'll contact you at ${sanitizedData.contactEmail} within 24 hours.`,
        duration: 6000,
      });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: "Please try again or contact support@procannedu.com",
        variant: "destructive",
      });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formValues.organizationName && formValues.legalEntityName;
      case 2: return formValues.licenseType && formValues.licenseNumber && formValues.licenseIssueDate && formValues.licenseExpiryDate;
      case 3: return formValues.contactPerson && formValues.contactEmail && formValues.contactPhone && formValues.address && formValues.estimatedEmployees && formValues.preferredStartDate;
      case 4: return formValues.complianceAffirmation && formValues.privacyAcknowledgment && formValues.trainingResponsibility;
      default: return false;
    }
  };

  const handleNext = async () => {
    const isValid = await trigger();
    if (isValid && canProceed()) setCurrentStep(currentStep + 1);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Application Submitted!</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Dispensary Application - Step {currentStep}/4</CardTitle>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`h-2 flex-1 rounded-full ${step <= currentStep ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div><Label>Organization Name * <span className="text-xs text-muted-foreground">({formValues.organizationName?.length || 0}/200)</span></Label>
                  <Input {...register('organizationName')} placeholder="Green Leaf Dispensary" />
                  {errors.organizationName && <p className="text-sm text-destructive">{errors.organizationName.message}</p>}
                </div>
                <div><Label>Legal Entity Name *</Label>
                  <Input {...register('legalEntityName')} placeholder="Green Leaf LLC" />
                  {errors.legalEntityName && <p className="text-sm text-destructive">{errors.legalEntityName.message}</p>}
                </div>
                <div><Label>DBA Name</Label><Input {...register('dbaName')} /></div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div><Label>License Type *</Label>
                  <Select value={formValues.licenseType} onValueChange={(v) => setValue('licenseType', v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dispensary">Dispensary</SelectItem>
                      <SelectItem value="processor">Processor</SelectItem>
                      <SelectItem value="grower">Grower</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.licenseType && <p className="text-sm text-destructive">{errors.licenseType.message}</p>}
                </div>
                <div><Label>License Number *</Label>
                  <Input {...register('licenseNumber')} placeholder="MD-DISP-12345" />
                  {errors.licenseNumber && <p className="text-sm text-destructive">{errors.licenseNumber.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Issue Date *</Label><Input type="date" {...register('licenseIssueDate')} />
                    {errors.licenseIssueDate && <p className="text-sm text-destructive">{errors.licenseIssueDate.message}</p>}
                  </div>
                  <div><Label>Expiry Date *</Label><Input type="date" {...register('licenseExpiryDate')} />
                    {errors.licenseExpiryDate && <p className="text-sm text-destructive">{errors.licenseExpiryDate.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div><Label>Contact Person *</Label><Input {...register('contactPerson')} />
                  {errors.contactPerson && <p className="text-sm text-destructive">{errors.contactPerson.message}</p>}
                </div>
                <div><Label>Email *</Label><Input type="email" {...register('contactEmail')} />
                  {errors.contactEmail && <p className="text-sm text-destructive">{errors.contactEmail.message}</p>}
                </div>
                <div><Label>Phone *</Label><PhoneInput {...register('contactPhone')} />
                  {errors.contactPhone && <p className="text-sm text-destructive">{errors.contactPhone.message}</p>}
                </div>
                <div><Label>Address * <span className="text-xs text-muted-foreground">({formValues.address?.length || 0}/500)</span></Label>
                  <Input {...register('address')} />
                  {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
                </div>
                <div><Label>Employees *</Label><Input type="number" min="1" {...register('estimatedEmployees', { valueAsNumber: true })} />
                  {errors.estimatedEmployees && <p className="text-sm text-destructive">{errors.estimatedEmployees.message}</p>}
                </div>
                <div><Label>Start Date *</Label><Input type="date" {...register('preferredStartDate')} />
                  {errors.preferredStartDate && <p className="text-sm text-destructive">{errors.preferredStartDate.message}</p>}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox checked={formValues.complianceAffirmation} onCheckedChange={(c) => setValue('complianceAffirmation', !!c)} />
                  <Label className="leading-normal">I affirm compliance with Maryland Cannabis Administration regulations</Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox checked={formValues.privacyAcknowledgment} onCheckedChange={(c) => setValue('privacyAcknowledgment', !!c)} />
                  <Label className="leading-normal">I acknowledge privacy policy</Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox checked={formValues.trainingResponsibility} onCheckedChange={(c) => setValue('trainingResponsibility', !!c)} />
                  <Label className="leading-normal">I accept training responsibility</Label>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              {currentStep > 1 && <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>Previous</Button>}
              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext} disabled={!canProceed()} className="ml-auto">Next</Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || !canProceed()} className="ml-auto">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit Application'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispensaryApplication;
