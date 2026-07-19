import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Shield, FileCheck } from 'lucide-react';

export const ComplianceDisclaimer = () => {
  return (
    <div className="space-y-6">
      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <Shield className="h-5 w-5 text-primary" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">COMAR Compliance</div>
          <p className="text-sm leading-relaxed text-foreground">
            Curriculum designed to align with Maryland Cannabis Administration Responsible Vendor Training standards (COMAR 14.17.15.05). Content is reviewed and updated when regulations change. ProCann Edu is an independent training provider; completion of this course does not constitute MCA endorsement.
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <DollarSign className="h-5 w-5 text-green-600" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">Pricing Compliance</div>
          <p className="text-sm leading-relaxed text-foreground">
            ProCann Edu charges $49.99 per student, maintaining compliance with Maryland's $50.00 maximum charge per employee for RVT training as specified in Maryland Cannabis Administration RVT Standards.
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <FileCheck className="h-5 w-5 text-blue-600" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">Certificate Validity</div>
          <p className="text-sm leading-relaxed text-foreground">
            Upon successful completion of all 19 required modules and passing the final exam (minimum 80% score), students receive a certificate of completion. Certificates can be verified at any time through our public verification portal. Individual results depend on study habits and prior knowledge.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};
