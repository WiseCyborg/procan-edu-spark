import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Building2, HelpCircle, Phone, Mail, Clock } from 'lucide-react';

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const faqData = {
    individual: [
      {
        id: 'account-1',
        question: 'How do I create an account?',
        answer: 'Click "Get Started" on the homepage, enter your email and create a password. You\'ll receive a welcome email to verify your account.',
        category: 'Account Management'
      },
      {
        id: 'account-2',
        question: 'I forgot my password. How do I reset it?',
        answer: 'On the login page, click "Forgot Password?" and enter your email. You\'ll receive a password reset link within 5 minutes.',
        category: 'Account Management'
      },
      {
        id: 'course-1',
        question: 'How long do I have to complete the course?',
        answer: 'You have unlimited time to complete the course. However, we recommend finishing within 30 days to maintain momentum.',
        category: 'Course Access'
      },
      {
        id: 'course-2',
        question: 'Can I take the course on my mobile device?',
        answer: 'Yes! Our platform is fully responsive and works on smartphones, tablets, and computers. We recommend using Chrome, Safari, or Firefox for the best experience.',
        category: 'Course Access'
      },
      {
        id: 'course-3',
        question: 'What happens if I fail the final exam?',
        answer: 'You can retake the final exam up to 3 times. There\'s a 24-hour waiting period between attempts. Additional study materials will be provided after each failed attempt.',
        category: 'Course Access'
      },
      {
        id: 'cert-1',
        question: 'How do I download my certificate?',
        answer: 'After passing the final exam, your certificate will be automatically generated. You can download it from your dashboard or receive it via email.',
        category: 'Certification'
      },
      {
        id: 'cert-2',
        question: 'How long is my certificate valid?',
        answer: 'Your Responsible Vendor Training certificate is valid for 2 years from the issue date, as required by the Maryland Cannabis Administration.',
        category: 'Certification'
      },
      {
        id: 'cert-3',
        question: 'Can I verify someone else\'s certificate?',
        answer: 'Yes, use our public certificate verification tool by entering the certificate number. This helps employers verify employee certifications.',
        category: 'Certification'
      },
      {
        id: 'tech-1',
        question: 'The videos won\'t play. What should I do?',
        answer: 'Ensure you have a stable internet connection and try refreshing the page. Clear your browser cache or try a different browser. Contact support if issues persist.',
        category: 'Technical Support'
      },
      {
        id: 'tech-2',
        question: 'I\'m experiencing audio issues during the course.',
        answer: 'Check your device volume and ensure other applications aren\'t using your audio. Try using headphones or external speakers. Update your browser if needed.',
        category: 'Technical Support'
      }
    ],
    dispensary: [
      {
        id: 'disp-1',
        question: 'How do I enroll multiple employees at once?',
        answer: 'Use our bulk enrollment feature in the Dispensary Portal. Upload a CSV file with employee information or add them individually through the dashboard.',
        category: 'Bulk Management'
      },
      {
        id: 'disp-2',
        question: 'Can I track my employees\' progress?',
        answer: 'Yes! The Dispensary Portal provides real-time progress tracking, completion rates, and detailed analytics for all enrolled employees.',
        category: 'Progress Tracking'
      },
      {
        id: 'disp-3',
        question: 'What compliance reports are available?',
        answer: 'We provide MCA-compliant reports including employee certification status, completion dates, renewal schedules, and audit-ready documentation.',
        category: 'Compliance'
      },
      {
        id: 'disp-4',
        question: 'How does billing work for organizations?',
        answer: 'Organizations are billed monthly based on enrolled users. We offer volume discounts for 50+ employees and provide detailed invoicing with payment tracking.',
        category: 'Billing'
      },
      {
        id: 'disp-5',
        question: 'Can I get reminded about certificate renewals?',
        answer: 'Yes! We automatically send renewal reminders 90, 60, and 30 days before certificate expiration. Bulk renewal options are available.',
        category: 'Renewal Management'
      },
      {
        id: 'disp-6',
        question: 'What happens if an employee leaves our company?',
        answer: 'You can deactivate employees in your portal. Their certificates remain valid, but they won\'t count toward your billing. You can reactivate them if they return.',
        category: 'Employee Management'
      }
    ],
    general: [
      {
        id: 'gen-1',
        question: 'What is the Responsible Vendor Training (RVT)?',
        answer: 'RVT is mandatory training required by the Maryland Cannabis Administration for all cannabis industry employees. It covers regulations, safety, and compliance.',
        category: 'About Training'
      },
      {
        id: 'gen-2',
        question: 'Is ProCann Edu approved by the Maryland Cannabis Administration?',
        answer: 'Yes, ProCann Edu is fully approved and compliant with all MCA requirements for Responsible Vendor Training programs.',
        category: 'About Training'
      },
      {
        id: 'gen-3',
        question: 'How much does the training cost?',
        answer: 'Individual training is $49.99. Organizations get volume discounts: 10-49 employees (10% off), 50+ employees (20% off). Contact us for custom pricing.',
        category: 'Pricing'
      },
      {
        id: 'gen-4',
        question: 'Do you offer refunds?',
        answer: 'We offer a 30-day money-back guarantee if you\'re not satisfied with the course content, provided you haven\'t completed more than 25% of the material.',
        category: 'Pricing'
      },
      {
        id: 'gen-5',
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, MasterCard, American Express), ACH bank transfers for organizations, and PayPal.',
        category: 'Pricing'
      },
      {
        id: 'gen-6',
        question: 'Can I get a receipt for my purchase?',
        answer: 'Yes, receipts are automatically emailed after purchase and available in your account dashboard. Organizations receive detailed invoices.',
        category: 'Pricing'
      }
    ]
  };

  const categories = ['Account Management', 'Course Access', 'Certification', 'Technical Support', 'Bulk Management', 'Progress Tracking', 'Compliance', 'Billing', 'Renewal Management', 'Employee Management', 'About Training', 'Pricing'];

  const getAllFAQs = () => {
    return [...faqData.individual, ...faqData.dispensary, ...faqData.general];
  };

  const filteredFAQs = (faqs: typeof faqData.individual) => {
    if (!searchTerm) return faqs;
    return faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Account Management': 'bg-blue-100 text-blue-800',
      'Course Access': 'bg-green-100 text-green-800',
      'Certification': 'bg-yellow-100 text-yellow-800',
      'Technical Support': 'bg-red-100 text-red-800',
      'Bulk Management': 'bg-purple-100 text-purple-800',
      'Progress Tracking': 'bg-indigo-100 text-indigo-800',
      'Compliance': 'bg-orange-100 text-orange-800',
      'Billing': 'bg-cyan-100 text-cyan-800',
      'Renewal Management': 'bg-pink-100 text-pink-800',
      'Employee Management': 'bg-teal-100 text-teal-800',
      'About Training': 'bg-lime-100 text-lime-800',
      'Pricing': 'bg-amber-100 text-amber-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-700 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions about ProCann Edu's cannabis training platform
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search frequently asked questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-3 text-lg"
            />
          </div>
        </div>

        {/* Contact Support */}
        <Card className="max-w-4xl mx-auto mb-8 border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center text-green-700">
              <HelpCircle className="mr-2 h-5 w-5" />
              Need Additional Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-gray-600">
                <Mail className="mr-2 h-4 w-4 text-green-600" />
                <span>info@procannedu.com</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="mr-2 h-4 w-4 text-green-600" />
                <span>Mon-Fri 9AM-6PM EST</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Content */}
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="individual" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Individual Users
              </TabsTrigger>
              <TabsTrigger value="dispensary" className="flex items-center">
                <Building2 className="mr-2 h-4 w-4" />
                Dispensaries
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center">
                <HelpCircle className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
            </TabsList>

            <TabsContent value="individual">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-700">
                    <User className="mr-2 h-5 w-5" />
                    Individual User Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {filteredFAQs(faqData.individual).map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center justify-between w-full mr-4">
                            <span>{faq.question}</span>
                            <Badge className={getCategoryColor(faq.category)}>
                              {faq.category}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dispensary">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-700">
                    <Building2 className="mr-2 h-5 w-5" />
                    Dispensary & Organization Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {filteredFAQs(faqData.dispensary).map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center justify-between w-full mr-4">
                            <span>{faq.question}</span>
                            <Badge className={getCategoryColor(faq.category)}>
                              {faq.category}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-700">
                    <HelpCircle className="mr-2 h-5 w-5" />
                    General Platform Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {filteredFAQs(faqData.general).map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center justify-between w-full mr-4">
                            <span>{faq.question}</span>
                            <Badge className={getCategoryColor(faq.category)}>
                              {faq.category}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default FAQ;