import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, TrendingUp } from 'lucide-react';

export const InvestmentValueCard = () => {
  const features = [
    {
      title: 'AI-Powered ROI Tracking',
      description: 'Track compliance savings in real-time',
      outcome: 'Average outcome: $12K+ annual savings',
    },
    {
      title: 'Live COMAR Regulatory Updates',
      description: 'Always aligned to latest MCA standards',
      outcome: 'Automatic curriculum updates',
    },
    {
      title: '87% First-Attempt Pass Rate',
      description: 'Comprehensive exam preparation',
      outcome: 'Practice quizzes with instant feedback',
    },
    {
      title: 'Maryland-Specific Content',
      description: '23 modules tailored to MD regulations',
      outcome: 'County-specific compliance scenarios',
    },
    {
      title: '24/7 AI Compliance Assistant',
      description: 'Instant answers to your questions',
      outcome: 'Maryland regulatory expertise',
    },
    {
      title: 'Lifetime Certificate Access',
      description: 'Digital certificate with verification',
      outcome: 'Free updates for renewals',
    },
    {
      title: '4-6 Hour Completion Time',
      description: 'Self-paced learning',
      outcome: 'Mobile-friendly platform',
    },
  ];

  return (
    <Card className="max-w-5xl mx-auto bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl md:text-3xl text-foreground">
          What's Included in Your $49.99 Investment
        </CardTitle>
        <p className="text-muted-foreground mt-2">
          Your Maryland RVT Certification includes:
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
                <p className="text-sm text-primary font-medium mt-1">{feature.outcome}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-primary/20 pt-6 mt-6">
          <div className="flex items-center justify-center gap-3 bg-white/50 dark:bg-background/50 rounded-lg p-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Investment: $49.99</strong> (under Maryland's $50 maximum)
              </p>
              <p className="text-sm font-semibold text-primary mt-1">
                Typical ROI: 24,000% in first year through reduced retakes and compliance costs
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
