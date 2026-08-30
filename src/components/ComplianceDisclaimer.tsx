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
            Content is reviewed when published Maryland cannabis rules change. ProCann Edu is an independent training provider; completion of this course does not constitute MCA endorsement and does not satisfy Maryland's annual responsible vendor / agent training duty.
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <DollarSign className="h-5 w-5 text-green-600" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">Pricing Compliance</div>
          <p className="text-sm leading-relaxed text-foreground">
            ProCann Edu charges $49.99 per student.
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <FileCheck className="h-5 w-5 text-blue-600" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">Completion Record Criteria</div>
          <p className="text-sm leading-relaxed text-foreground">
            A completion record is issued once a student completes the required core modules and passes the final exam (minimum 80% score). The manager track adds optional supplemental modules. Historical completion records may reflect the curriculum in place at the time of issuance and do not imply completion of the current module set. Completion records can be checked at any time through our public verification portal. Individual results depend on study habits and prior knowledge.
          </p>

        </AlertDescription>
      </Alert>
    </div>
  );
};
