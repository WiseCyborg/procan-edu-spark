import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { dispensaryApplicationSchema } from '@/lib/validation-schemas';
import { sanitizeFormData } from '@/lib/sanitization';
import { PhoneInput } from '@/components/ui/phone-input';
import { invokePublicFunction } from '@/lib/publicEdgeFunctions';
import { extractApplicationId, paymentPathForApplication, storeApplicationId } from '@/lib/applyPaymentFlow';
import type { z } from 'zod';

type FormData = z.infer<typeof dispensaryApplicationSchema>;

const DispensaryApplication = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = React.useState(1);
  const [submitted, setSubmitted] = React.useState(false);
  const [applicationId, setApplicationId] = React.useState<string | null>(null);
  const [alreadyOnFile, setAlreadyOnFile] = React.useState(false);

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
    console.log('Submitting application with data:', sanitizedData);

    try {
      const { data: result, error, raw, status } = await invokePublicFunction(
        'submit-dispensary-application',
        sanitizedData
      );

      console.log('Full submission response:', { result, error, status, raw });

      // Success: backend confirmed the save. It already returns applicationId;
      // keep it so the applicant can bookmark /payment/:id. Checkout stays closed
      // until approval — do not navigate into a collect.
      if (!error && (result?.success === true || status === 201)) {
        const savedId = extractApplicationId(result, raw);
        if (savedId) {
          storeApplicationId(savedId);
          setApplicationId(savedId);
        }
        setSubmitted(true);
        toast({
          title: "Application Received ✅",
          description: "Saved and pending review. Payment is not collected until approval.",
          duration: 6000,
        });
        return;
      }

      const errorCode = raw?.code || error?.message || '';

      if (errorCode?.includes('RATE_LIMIT_EXCEEDED')) {
        toast({
          title: "Please Wait",
          description: "Too many submissions recently. Please try again in a few minutes.",
          variant: "destructive",
        });
        return;
      }

      if (errorCode?.includes('DUPLICATE_APPLICATION') || errorCode?.includes('DUPLICATE_EMAIL')) {
        const savedId = extractApplicationId(raw, result);
        if (savedId) {
          storeApplicationId(savedId);
          setApplicationId(savedId);
        }
        setAlreadyOnFile(true);
        setSubmitted(true);
        toast({
          title: "Application Received ✅",
          description: "We already have your application on file. Check your email for updates.",
          duration: 6000,
        });
        return;
      }

      if (errorCode?.includes('RESUBMIT_TOO_SOON')) {
        toast({
          title: "Please Wait",
          description: raw?.error || "Please wait a few days before resubmitting.",
          variant: "destructive",
        });
        return;
      }

      if (errorCode?.includes('VALIDATION_ERROR')) {
        const failedFields = raw?.failedFields;
        const description = Array.isArray(failedFields) && failedFields.length > 0
          ? failedFields.join(", ")
          : (raw?.error || "Please review your entries and try again.");
        toast({
          title: "Please check your entries",
          description,
          variant: "destructive",
        });
        return;
      }

      // Any other backend error or non-2xx response
      toast({
        title: "Submission not completed",
        description: "We couldn't confirm your submission. Please try again, or contact support if this continues.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error('Submission exception:', error);
      toast({
        title: "Submission not completed",
        description: "We couldn't confirm your submission. Please try again, or contact support if this continues.",
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
    let fieldsToValidate: (keyof FormData)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['organizationName', 'legalEntityName', 'dbaName'];
        break;
      case 2:
        fieldsToValidate = ['licenseType', 'licenseNumber', 'licenseIssueDate', 'licenseExpiryDate'];
        break;
      case 3:
        fieldsToValidate = ['contactPerson', 'contactEmail', 'contactPhone', 'address', 'estimatedEmployees', 'preferredStartDate'];
        break;
    }
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid && canProceed()) setCurrentStep(currentStep + 1);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Application Received</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {alreadyOnFile
                ? 'We already have an application on file for this contact email. It is still pending review.'
                : 'Your application has been saved and is pending review.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Payment is not collected on this form. If the application is approved, you will receive
              an email with a payment link. Keep your application ID — the payment page needs it.
            </p>
            {applicationId && (
              <div className="text-start text-sm bg-muted/50 p-3 rounded-md space-y-2">
                <p>
                  <span className="font-medium">Application ID:</span>{' '}
                  <code className="font-mono break-all">{applicationId}</code>
                </p>
                <p className="text-muted-foreground">
                  Bookmark this payment page. Checkout stays closed until approval:
                </p>
                <a
                  href={paymentPathForApplication(applicationId)}
                  className="text-primary underline break-all"
                >
                  {paymentPathForApplication(applicationId)}
                </a>
              </div>
            )}
            <Button onClick={() => navigate('/')} className="w-full">Return home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>{currentStep === 4 ? 'Dispensary Application — Final Step' : `Dispensary Application - Step ${currentStep}/4`}</CardTitle>
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
                <div><Label>Organization Name * <span className="text-xs text-muted-foreground">({String(formValues.organizationName || '').length}/200)</span></Label>
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
                  <Select value={String(formValues.licenseType || '')} onValueChange={(v) => setValue('licenseType', v as 'dispensary' | 'processor' | 'grower' | 'other')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dispensary">Dispensary (DA)</SelectItem>
                      <SelectItem value="processor">Processor (PA)</SelectItem>
                      <SelectItem value="grower">Grower (GA)</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.licenseType && <p className="text-sm text-destructive">{errors.licenseType.message}</p>}
                </div>
                <div><Label>MCA License Number *</Label>
                  <Input {...register('licenseNumber')} placeholder="DA-23-00089" />
                  <p className="text-xs text-muted-foreground mt-1">Format: DA-YY-##### (e.g., DA-23-00089, GA-25-00001)</p>
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
                <div><Label>Address * <span className="text-xs text-muted-foreground">({String(formValues.address || '').length}/500)</span></Label>
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
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 rtl:space-x-reverse">
                    <Checkbox id="compliance" checked={Boolean(formValues.complianceAffirmation)} onCheckedChange={(c) => setValue('complianceAffirmation', !!c)} />
                    <Label htmlFor="compliance" className="leading-normal cursor-pointer">
                      I confirm the information provided is accurate to the best of my knowledge
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3 rtl:space-x-reverse">
                    <Checkbox id="privacy" checked={Boolean(formValues.privacyAcknowledgment)} onCheckedChange={(c) => setValue('privacyAcknowledgment', !!c)} />
                    <Label htmlFor="privacy" className="leading-normal cursor-pointer">
                      I agree to the ProCann Edu privacy policy
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3 rtl:space-x-reverse">
                    <Checkbox id="training" checked={Boolean(formValues.trainingResponsibility)} onCheckedChange={(c) => setValue('trainingResponsibility', !!c)} />
                    <Label htmlFor="training" className="leading-normal cursor-pointer">
                      I understand that verification is required before staff certificates can be issued under this organization
                    </Label>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <strong>Note:</strong> Submitting this form starts a review. Payment is not
                  collected here. If the application is approved, you will receive an email with a
                  payment link for that application ID.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-6">
              {currentStep > 1 && <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>Previous</Button>}
              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext} disabled={!canProceed()} className="ms-auto">Next</Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || !canProceed()} className="ms-auto">
                  {isSubmitting ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Saving...</> : 'Finish & Save'}
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
