import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, FileText, Contact, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateDateRange } from '@/utils/validation-helpers';

const DispensaryApplication = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1: Business Details
  const [organizationName, setOrganizationName] = useState('');
  const [legalEntityName, setLegalEntityName] = useState('');
  const [dbaName, setDbaName] = useState('');

  // Step 2: MCA License
  const [licenseType, setLicenseType] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssueDate, setLicenseIssueDate] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');

  // Step 3: Contact & Address
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [estimatedEmployees, setEstimatedEmployees] = useState('');
  const [preferredStartDate, setPreferredStartDate] = useState('');

  // Clear any cached date that's in the past on mount
  useEffect(() => {
    if (preferredStartDate) {
      const selectedDate = new Date(preferredStartDate + 'T00:00:00');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (selectedDate < tomorrow) {
        setPreferredStartDate(''); // Clear invalid cached date
      }
    }
  }, []);

  // Step 4: Attestations
  const [complianceAffirmation, setComplianceAffirmation] = useState(false);
  const [privacyAcknowledgment, setPrivacyAcknowledgment] = useState(false);
  const [trainingResponsibility, setTrainingResponsibility] = useState(false);

  const validateDatabaseSchema = async () => {
    try {
      const { error } = await supabase
        .from('dispensary_applications')
        .select('compliance_affirmation')
        .limit(0);
      
      if (error && error.code === '42703') {
        toast({
          title: "System Configuration Error",
          description: "The application form is not properly configured. Please contact support at support@procannedu.com",
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (err) {
      console.error('Schema validation error:', err);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!complianceAffirmation || !privacyAcknowledgment || !trainingResponsibility) {
      toast({
        title: "Attestations Required",
        description: "Please confirm all attestations to continue.",
        variant: "destructive",
      });
      return;
    }

    // Validate date range
    if (licenseIssueDate && licenseExpiryDate) {
      const dateValidation = validateDateRange(licenseIssueDate, licenseExpiryDate);
      if (!dateValidation.valid) {
        toast({
          title: "Invalid License",
          description: dateValidation.error || "Please check your license dates",
          variant: "destructive",
        });
        
        // Log validation failure
        await supabase.from('user_operation_logs').insert({
          operation_type: 'dispensary_application_submit',
          success: false,
          error_message: 'Date validation failed: License expired',
          error_details: { dateValidation },
          operation_data: { licenseIssueDate, licenseExpiryDate }
        });
        
        return;
      }

      // Show warnings but don't block submission
      if (dateValidation.warnings && dateValidation.warnings.length > 0) {
        toast({
          title: "Please Review",
          description: dateValidation.warnings.join(' '),
          variant: "default",
        });
        // Continue with submission
      }
    }

    // Validate schema before submission
    if (!(await validateDatabaseSchema())) {
      return;
    }

    // Validate preferred_start_date before submission
    if (preferredStartDate) {
      const selectedDate = new Date(preferredStartDate + 'T00:00:00');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (selectedDate < tomorrow) {
        toast({
          title: "Invalid Training Start Date",
          description: "Preferred training start date must be at least tomorrow or later.",
          variant: "destructive",
        });
        return; // Stop submission
      }
    }

    setLoading(true);
    
    try {
      // PHASE 1: Save application to database (CRITICAL - must succeed)
      const { data: insertedApp, error: dbError } = await supabase
        .from('dispensary_applications')
        .insert({
          organization_name: organizationName,
          legal_entity_name: legalEntityName,
          dba_name: dbaName || organizationName,
          license_type: licenseType,
          license_number: licenseNumber,
          license_issue_date: licenseIssueDate || null,
          license_expiry_date: licenseExpiryDate || null,
          contact_person: contactPerson,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address: address,
          estimated_employees: parseInt(estimatedEmployees) || null,
          preferred_start_date: preferredStartDate ? `${preferredStartDate}T00:00:00Z` : null,
          compliance_affirmation: true,
          application_status: 'pending',
        })
        .select('id')
        .single();

      // ❌ Database failed - this IS a real error
      if (dbError) throw dbError;

      // ✅ Application saved successfully!
      console.log('✅ Application saved to database:', insertedApp.id);
      setSubmitted(true);

      // PHASE 2: Send confirmation email (NON-BLOCKING - nice to have)
      let emailDelivered = false;
      try {
        console.log('📧 Attempting to send confirmation email to:', contactEmail);
        
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          'send-application-confirmation',
          {
            body: {
              application_id: insertedApp.id,
              contact_person: contactPerson,
              contact_email: contactEmail,
              organization_name: organizationName,
              license_number: licenseNumber
            }
          }
        );

        if (emailError) {
          console.warn('⚠️ Email function error (non-critical):', emailError);
        } else if (emailResult?.success) {
          console.log('✅ Confirmation email sent successfully via', emailResult.provider);
          emailDelivered = true;
        } else {
          console.warn('⚠️ Email send failed (non-critical):', emailResult);
        }
      } catch (emailException) {
        // Email completely failed but application is saved - this is OK
        console.warn('⚠️ Email sending exception (non-critical):', emailException);
      }

      // Show appropriate success message based on email delivery
      if (emailDelivered) {
        toast({
          title: "Application Submitted! ✅",
          description: `Confirmation email sent to ${contactEmail}. We'll review your application within 24-48 hours.`,
          duration: 6000,
        });
      } else {
        toast({
          title: "Application Submitted! ✅",
          description: `Your application has been received. We'll contact you at ${contactEmail} within 24 hours.`,
          variant: "default",
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('❌ Application submission failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        timestamp: new Date().toISOString(),
        formData: {
          organization_name: organizationName,
          contact_email: contactEmail,
          license_number: licenseNumber,
          estimated_employees: estimatedEmployees,
          compliance_affirmation: complianceAffirmation,
          preferred_start_date: preferredStartDate,
          license_issue_date: licenseIssueDate,
          license_expiry_date: licenseExpiryDate,
          calculated_values: {
            preferred_start_date_sent: preferredStartDate ? `${preferredStartDate}T00:00:00Z` : null,
            current_browser_date: new Date().toISOString().split('T')[0],
            browser_timezone_offset: new Date().getTimezoneOffset()
          }
        }
      });
      
      let errorMessage = "Failed to submit application. ";
      
      if (error.code === '23505') {
        errorMessage += "This license number is already registered.";
      } else if (error.code === '23502') {
        errorMessage += "Please fill in all required fields.";
      } else if (error.code === '42703') {
        errorMessage += "Database schema error - please contact support.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return organizationName && legalEntityName;
      case 2:
        return licenseType && licenseNumber;
      case 3:
        return contactPerson && contactEmail && contactPhone && address;
      case 4:
        return complianceAffirmation && privacyAcknowledgment && trainingResponsibility;
      default:
        return false;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Application Submitted Successfully!</CardTitle>
            <CardDescription>
              Thank you for your interest in ProCann Edu's Responsible Vendor Training program.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="font-semibold text-green-800 mb-2">What happens next?</h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li>✓ Our admin team will review your application within 24-48 hours</li>
                <li>✓ We'll verify your MCA license information</li>
                <li>✓ Once approved, you'll receive an email with:
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>• Your unique Dispensary Number</li>
                    <li>• Payment instructions for training seats</li>
                    <li>• Instructions to add Training Coordinators</li>
                  </ul>
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/')}>Return to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Dispensary Application - Maryland RVT</CardTitle>
          <CardDescription>
            Step {currentStep} of 4: Complete all steps to submit your application
          </CardDescription>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Business Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Business Details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Organization Name *</Label>
                  <Input
                    id="orgName"
                    placeholder="e.g., Green Leaf Dispensary"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="legalName">Legal Entity Name *</Label>
                  <Input
                    id="legalName"
                    placeholder="e.g., Green Leaf LLC"
                    value={legalEntityName}
                    onChange={(e) => setLegalEntityName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dbaName">DBA Name (if different)</Label>
                  <Input
                    id="dbaName"
                    placeholder="Doing Business As..."
                    value={dbaName}
                    onChange={(e) => setDbaName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: MCA License */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">MCA License Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="licenseType">License Type *</Label>
                  <Select value={licenseType} onValueChange={setLicenseType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select license type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Adult Use">Adult Use Dispensary</SelectItem>
                      <SelectItem value="Medical">Medical Dispensary</SelectItem>
                      <SelectItem value="Dual License">Dual License (Adult Use + Medical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="licenseNumber">MCA License Number *</Label>
                  <Input
                    id="licenseNumber"
                    placeholder="e.g., MD-DISP-2024-001"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="issueDate">License Issue Date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={licenseIssueDate}
                      onChange={(e) => setLicenseIssueDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">License Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={licenseExpiryDate}
                      onChange={(e) => setLicenseExpiryDate(e.target.value)}
                      min={licenseIssueDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                {licenseIssueDate && licenseExpiryDate && (() => {
                  const validation = validateDateRange(licenseIssueDate, licenseExpiryDate);
                  return !validation.valid ? (
                    <div className="flex items-center gap-2 text-sm text-destructive mt-2">
                      <AlertCircle className="h-4 w-4" />
                      {validation.error}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* Step 3: Contact & Address */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Contact className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Contact Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contactPerson">Contact Person (Manager) *</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Full Name"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail">Email *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="manager@dispensary.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Phone *</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="(410) 555-0100"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Physical Address *</Label>
                  <Input
                    id="address"
                    placeholder="Street, City, State, ZIP"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employees">Estimated Employees</Label>
                    <Input
                      id="employees"
                      type="number"
                      placeholder="e.g., 15"
                      value={estimatedEmployees}
                      onChange={(e) => setEstimatedEmployees(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Preferred Training Start (Optional)</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={preferredStartDate}
                      onChange={(e) => setPreferredStartDate(e.target.value)}
                      min={(() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return tomorrow.toISOString().split('T')[0];
                      })()}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a future date when you'd like training to begin. Leave blank if unsure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Attestations */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Attestations & Acknowledgments</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="compliance"
                    checked={complianceAffirmation}
                    onCheckedChange={(checked) => setComplianceAffirmation(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="compliance" className="font-normal cursor-pointer">
                      <strong>Compliance Affirmation:</strong> I certify that all information provided is accurate and complete. I understand that false statements may result in denial or revocation of training access.
                    </Label>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy"
                    checked={privacyAcknowledgment}
                    onCheckedChange={(checked) => setPrivacyAcknowledgment(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="privacy" className="font-normal cursor-pointer">
                      <strong>Data Privacy Acknowledgment:</strong> I acknowledge that ProCann Edu will collect and process employee training data in accordance with Maryland privacy laws and our Privacy Policy.
                    </Label>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="training"
                    checked={trainingResponsibility}
                    onCheckedChange={(checked) => setTrainingResponsibility(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="training" className="font-normal cursor-pointer">
                      <strong>Training Responsibility:</strong> I acknowledge our organization's responsibility to ensure all employees complete required RVT training per COMAR Title 14, Subtitle 17 regulations.
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={loading}
              >
                Previous
              </Button>
            )}
            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="ml-auto"
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="ml-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispensaryApplication;
