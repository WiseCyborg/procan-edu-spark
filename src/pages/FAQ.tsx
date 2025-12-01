import React from 'react';
import { EnhancedFAQ } from '@/components/ui/enhanced-faq';
import { SupabaseEmailTrustIndicator } from '@/components/ui/supabase-email-trust-indicator';
import { EmailTroubleshootingGuide } from '@/components/ui/email-troubleshooting-guide';

const FAQ = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <EnhancedFAQ />
        <SupabaseEmailTrustIndicator />
        <EmailTroubleshootingGuide />
      </div>
    </div>
  );
};

export default FAQ;