import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const ComplianceDisclaimer = () => {
  return (
    <div className="space-y-4 text-xs text-muted-foreground">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong className="text-foreground">Savings Claims:</strong> Average annual savings of $12,000+ based on analysis of 150 Maryland dispensaries between January 2024 - December 2024. Actual savings vary by dispensary size, current compliance infrastructure, and operational efficiency. Savings calculated from: reduced retake costs (45% fewer retakes), faster training completion (4-6 vs 8-12 hours), and AI-driven compliance recommendations. Full methodology available at{' '}
          <a href="/roi-methodology" className="underline hover:text-primary">
            /roi-methodology
          </a>
        </AlertDescription>
      </Alert>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong className="text-foreground">Pass Rate Claims:</strong> 87% first-attempt pass rate based on 2,500+ exam attempts by ProCann Edu students (January 2024 - December 2024). Maryland state average: 78% (source: MCA public data, 2024 Q4 report). Individual results may vary based on study habits and prior knowledge.
        </AlertDescription>
      </Alert>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong className="text-foreground">Training Numbers:</strong> As of January 2025: 2,500+ agents trained, 150+ dispensary partnerships across all 24 Maryland counties. Data verified through platform analytics and dispensary partnership agreements.
        </AlertDescription>
      </Alert>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong className="text-foreground">COMAR Compliance:</strong> Curriculum aligned to Maryland Cannabis Administration Responsible Vendor Training standards (COMAR 14.17.05) as of January 2025 review. Content updated automatically when regulations change. Last MCA alignment review: January 15, 2025.
        </AlertDescription>
      </Alert>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong className="text-foreground">Pricing Compliance:</strong> ProCann Edu charges $49.99 per student, maintaining full compliance with Maryland's $50.00 maximum charge per employee for RVT training (Maryland Cannabis Administration RVT Standards, verified March 2025).
        </AlertDescription>
      </Alert>
    </div>
  );
};
