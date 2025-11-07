import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, TrendingUp, Shield, Info } from 'lucide-react';

export const ComplianceDisclaimer = () => {
  return (
    <div className="space-y-6">
      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <DollarSign className="h-5 w-5 text-green-600" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">Savings Claims</div>
          <p className="text-sm leading-relaxed text-foreground">
            Average annual savings of $12,000+ based on analysis of 150 Maryland dispensaries between January 2024 - December 2024. Actual savings vary by dispensary size, current compliance infrastructure, and operational efficiency. Savings calculated from: reduced retake costs (45% fewer retakes), faster training completion (4-6 vs 8-12 hours), and AI-driven compliance recommendations. Full methodology available at{' '}
            <a href="/roi-methodology" className="underline text-primary hover:text-primary/80 font-medium">
              /roi-methodology
            </a>
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">Pass Rate Claims</div>
          <p className="text-sm leading-relaxed text-foreground">
            87% first-attempt pass rate based on 2,500+ exam attempts by ProCann Edu students (January 2024 - December 2024). Maryland state average: 78% (source: MCA public data, 2024 Q4 report). Individual results may vary based on study habits and prior knowledge.
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">Training Numbers</div>
          <p className="text-sm leading-relaxed text-foreground">
            As of January 2025: 2,500+ agents trained, 150+ dispensary partnerships across all 24 Maryland counties. Data verified through platform analytics and dispensary partnership agreements.
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <Shield className="h-5 w-5 text-primary" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">COMAR Compliance</div>
          <p className="text-sm leading-relaxed text-foreground">
            Curriculum aligned to Maryland Cannabis Administration Responsible Vendor Training standards (COMAR 14.17.05) as of January 2025 review. Content updated automatically when regulations change. Last MCA alignment review: January 15, 2025.
          </p>
        </AlertDescription>
      </Alert>

      <Alert className="border-2 border-primary/30 bg-white shadow-sm">
        <DollarSign className="h-5 w-5 text-green-600" />
        <AlertDescription className="space-y-2">
          <div className="text-sm font-bold text-primary mb-2">Pricing Compliance</div>
          <p className="text-sm leading-relaxed text-foreground">
            ProCann Edu charges $49.99 per student, maintaining full compliance with Maryland's $50.00 maximum charge per employee for RVT training (Maryland Cannabis Administration RVT Standards, verified March 2025).
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};
