import React from 'react';
import { EnhancedFAQ } from '@/components/ui/enhanced-faq';
import { SupabaseEmailTrustIndicator } from '@/components/ui/supabase-email-trust-indicator';
import { EmailTroubleshootingGuide } from '@/components/ui/email-troubleshooting-guide';
import { Seo } from '@/components/Seo';

// Curated public-tier Q/As for FAQPage JSON-LD. Mirror enhanced-faq.tsx
// public/student items; expand as the public FAQ grows.
const FAQ_JSONLD_ITEMS: Array<{ question: string; answer: string }> = [
  {
    question: 'How do I create an account and start training?',
    answer:
      'Click "Get Started" on the homepage, enter your email and create a password. After verification, you can access Maryland cannabis compliance training modules.',
  },
  {
    question: 'How long do I have to complete the course?',
    answer:
      'You have unlimited time to complete the course. However, we recommend finishing within 30 days to maintain momentum and retain information effectively.',
  },
  {
    question: 'What happens if I fail the final exam?',
    answer:
      'You can retake the final exam up to 3 times with a 24-hour waiting period between attempts. Additional study materials are provided after each attempt.',
  },
  {
    question: 'How do I download my certificate?',
    answer:
      'After passing the final exam with 80%+ score, your certificate is automatically generated. Download it from your dashboard or check your email.',
  },
  {
    question: 'How do I connect with my dispensary?',
    answer:
      'Your dispensary manager will provide you with an access key during enrollment. This links your account to your organization for compliance tracking.',
  },
];

const FAQ = () => {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_JSONLD_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Seo
        title="Frequently Asked Questions | ProCann Edu"
        description="Answers about Maryland RVT certification training, exams, certificates, dispensary enrollment, and team management on ProCann Edu."
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <EnhancedFAQ />
        <SupabaseEmailTrustIndicator />
        <EmailTroubleshootingGuide />
      </div>
    </div>
  );
};

export default FAQ;
