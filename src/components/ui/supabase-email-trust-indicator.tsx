import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Globe, Clock, Lock, Zap } from 'lucide-react';

export const SupabaseEmailTrustIndicator = () => {
  const trustMetrics = [
    {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: "99.9% Delivery Rate",
      description: "Enterprise-grade email infrastructure"
    },
    {
      icon: <Shield className="h-5 w-5 text-blue-600" />,
      title: "SOC 2 Compliant",
      description: "Enterprise security standards"
    },
    {
      icon: <Globe className="h-5 w-5 text-purple-600" />,
      title: "Global Infrastructure",
      description: "Reliable worldwide delivery"
    },
    {
      icon: <Clock className="h-5 w-5 text-orange-600" />,
      title: "Real-time Delivery",
      description: "Instant email processing"
    },
    {
      icon: <Lock className="h-5 w-5 text-red-600" />,
      title: "End-to-End Encryption",
      description: "Secure email transmission"
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-600" />,
      title: "Auto-Retry System",
      description: "Guaranteed delivery attempts"
    }
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-green-50/50 to-blue-50/50 dark:from-green-900/20 dark:to-blue-900/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Enterprise Email Infrastructure
          </span>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Powered by Supabase
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-muted-foreground">
            ProCann Edu uses <strong>Supabase's enterprise-grade email infrastructure</strong> to ensure 
            reliable, secure delivery of all your training communications. Trusted by thousands of companies worldwide.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trustMetrics.map((metric, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
              {metric.icon}
              <div>
                <h4 className="font-semibold text-sm">{metric.title}</h4>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Security Note:</strong> All emails are legitimate and verified. 
            The "Powered by Supabase" footer confirms you're receiving emails through our secure, enterprise infrastructure.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};