import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Building2, HelpCircle, Phone, Mail, Clock, Shield, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useContentLastUpdated } from '@/hooks/useContentLastUpdated';
import { formatDistanceToNow } from 'date-fns';
import { ListenButton } from '@/components/i18n/ListenButton';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  securityLevel: 'student' | 'manager' | 'admin' | 'public';
  tags?: string[];
}

interface EnhancedFAQProps {
  className?: string;
  showSearch?: boolean;
  defaultTab?: 'student' | 'dispensary' | 'admin' | 'general';
}

export const EnhancedFAQ: React.FC<EnhancedFAQProps> = ({
  className = '',
  showSearch = true,
  defaultTab = 'student'
}) => {
  const { roles, isAdmin, isDispensaryManager } = useUserRole();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const { lastUpdated, isLoading: isLoadingMetadata } = useContentLastUpdated('faq');
  const contentRef = useRef<HTMLDivElement>(null);

  const tr = (id: string, field: 'q' | 'a', fallback: string) =>
    t(`faq.items.${id}.${field}`, { defaultValue: fallback });


  const faqData: FAQItem[] = [
    // Student Level FAQs
    {
      id: 'student-1',
      question: 'How do I create an account and start training?',
      answer: 'Click "Get Started" on the homepage, enter your email and create a password. After verification, you can access Maryland cannabis compliance training modules.',
      category: 'Getting Started',
      securityLevel: 'student',
      tags: ['account', 'registration', 'training']
    },
    {
      id: 'student-2',
      question: 'How long do I have to complete the course?',
      answer: 'You have unlimited time to complete the course. However, we recommend finishing within 30 days to maintain momentum and retain information effectively.',
      category: 'Course Access',
      securityLevel: 'student'
    },
    {
      id: 'student-3',
      question: 'What happens if I fail the final exam?',
      answer: 'You can retake the final exam up to 3 times with a 24-hour waiting period between attempts. Additional study materials are provided after each attempt.',
      category: 'Certification',
      securityLevel: 'student'
    },
    {
      id: 'student-4',
      question: 'How do I download my certificate?',
      answer: 'After passing the final exam with 80%+ score, your certificate is automatically generated. Download it from your dashboard or check your email.',
      category: 'Certification',
      securityLevel: 'student'
    },
    {
      id: 'student-5',
      question: 'Can I see who has access to my training data?',
      answer: 'Yes! Check your profile settings under "Access Permissions" to see which managers (assigned by ProCann Admins) can view your progress. Only essential personnel have access.',
      category: 'Privacy & Security',
      securityLevel: 'student'
    },
    {
      id: 'student-6',
      question: 'How do I connect with my dispensary?',
      answer: 'Your dispensary manager will provide you with an access key during enrollment. This links your account to your organization for compliance tracking.',
      category: 'Dispensary Connection',
      securityLevel: 'student'
    },

    // Manager Level FAQs
    {
      id: 'manager-1',
      question: 'How do I get manager access assigned?',
      answer: 'ProCann Admins assign manager roles based on your organizational structure and authorization levels. Contact your system administrator or info@procannedu.com to request manager access.',
      category: 'Manager Access',
      securityLevel: 'manager',
      tags: ['permissions', 'access', 'role']
    },
    {
      id: 'manager-2',
      question: 'How do I enroll multiple employees at once?',
      answer: 'Use the bulk enrollment feature in your Dispensary Portal. Upload a CSV file with employee information or add them individually through the team management dashboard.',
      category: 'Employee Management',
      securityLevel: 'manager'
    },
    {
      id: 'manager-3',
      question: 'What compliance reports can I generate?',
      answer: 'Generate MCA-compliant reports including employee certification status, completion dates, renewal schedules, audit-ready documentation, and team progress analytics.',
      category: 'Compliance Reporting',
      securityLevel: 'manager'
    },
    {
      id: 'manager-4',
      question: 'How do I monitor employee progress and compliance?',
      answer: 'Your manager dashboard provides real-time progress tracking, completion rates, compliance status, and detailed analytics. Export reports for audit purposes.',
      category: 'Progress Monitoring',
      securityLevel: 'manager'
    },
    {
      id: 'manager-5',
      question: 'What security protocols should managers follow?',
      answer: 'Use multi-factor authentication, regularly review access logs, monitor team compliance, and report security incidents immediately. All manager actions are audit-logged.',
      category: 'Security Protocols',
      securityLevel: 'manager'
    },
    {
      id: 'manager-6',
      question: 'How do I manage certificate renewals for my team?',
      answer: 'Set up automatic renewal reminders 90, 60, and 30 days before expiration. Use bulk renewal options and track renewal status through your compliance dashboard.',
      category: 'Certificate Management',
      securityLevel: 'manager'
    },

    // Admin Level FAQs
    {
      id: 'admin-1',
      question: 'How do I manage user roles and permissions?',
      answer: 'Use the Admin Dashboard to assign roles (student, manager, admin), manage organizational structures, and control access permissions. All role changes are audit-logged.',
      category: 'User Management',
      securityLevel: 'admin',
      tags: ['roles', 'permissions', 'administration']
    },
    {
      id: 'admin-2',
      question: 'How do I create and manage organizations?',
      answer: 'Create organizations through the Admin Portal, assign unique access keys, set billing parameters, and manage organization-level settings including compliance requirements.',
      category: 'Organization Management',
      securityLevel: 'admin'
    },
    {
      id: 'admin-3',
      question: 'What system analytics and reports are available?',
      answer: 'Access comprehensive analytics including user engagement, completion rates, compliance metrics, security events, billing reports, and platform performance data.',
      category: 'System Analytics',
      securityLevel: 'admin'
    },
    {
      id: 'admin-4',
      question: 'How do I monitor security events and access logs?',
      answer: 'The Security Monitoring Dashboard shows real-time security events, user access patterns, failed login attempts, and system anomalies. Set up automated alerts for critical events.',
      category: 'Security Monitoring',
      securityLevel: 'admin'
    },
    {
      id: 'admin-5',
      question: 'How do I manage dispensary applications and approvals?',
      answer: 'Review dispensary applications in the Admin Portal, verify licenses, approve organizations, set course credits, and manage payment processing for organizational accounts.',
      category: 'Dispensary Management',
      securityLevel: 'admin'
    },

    // General/Public FAQs
    {
      id: 'general-1',
      question: 'What is the Responsible Vendor Training (RVT)?',
      answer: 'RVT is mandatory training required by the Maryland Cannabis Administration for all cannabis industry employees. It covers regulations, safety, compliance, and responsible practices.',
      category: 'About Training',
      securityLevel: 'public'
    },
    {
      id: 'general-2',
      question: 'Is ProCann Edu aligned with Maryland Cannabis Administration requirements?',
      answer: 'ProCann Edu is designed to meet MCA Responsible Vendor Training standards under COMAR 14.17.05. Our curriculum is regularly updated to align with current Maryland cannabis regulations.',
      category: 'Certification',
      securityLevel: 'public'
    },
    {
      id: 'general-3',
      question: 'How much does the training cost?',
      answer: 'Individual training is $49.99. Organizations receive volume discounts: 10-49 employees (10% off), 50+ employees (20% off). Contact us for custom enterprise pricing.',
      category: 'Pricing',
      securityLevel: 'public'
    },
    {
      id: 'general-4',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), ACH bank transfers for organizations, and PayPal. Billing is secure and PCI-compliant.',
      category: 'Payment',
      securityLevel: 'public'
    },

    // Supabase Email Service FAQs
    {
      id: 'email-1',
      question: 'What email service does ProCann Edu use?',
      answer: 'ProCann Edu uses Supabase\'s enterprise-grade email infrastructure, which provides 99.9% delivery reliability, enterprise security, and SOC 2 compliance. This ensures your account verification, password resets, and training notifications are delivered reliably.',
      category: 'Email Service',
      securityLevel: 'public',
      tags: ['email', 'reliability', 'supabase']
    },
    {
      id: 'email-2',
      question: 'Why do emails say "Powered by Supabase"?',
      answer: 'The "Powered by Supabase" footer indicates you\'re receiving emails from our trusted, enterprise-grade infrastructure. Supabase is a leading database and authentication platform used by thousands of companies worldwide for secure, reliable communications.',
      category: 'Email Service',
      securityLevel: 'public',
      tags: ['branding', 'trust', 'supabase']
    },
    {
      id: 'email-3',
      question: 'Are Supabase emails secure and legitimate?',
      answer: 'Yes! Supabase emails are highly secure with end-to-end encryption, anti-phishing protection, and enterprise security standards. All emails are legitimate and come from ProCann Edu\'s verified domain through Supabase\'s secure infrastructure.',
      category: 'Email Security',
      securityLevel: 'public',
      tags: ['security', 'encryption', 'legitimate']
    },
    {
      id: 'email-4',
      question: 'What types of emails will I receive?',
      answer: 'You\'ll receive account verification emails, password reset links, course completion confirmations, certificate notifications, and important compliance updates. All emails are sent through Supabase\'s reliable delivery system.',
      category: 'Email Types',
      securityLevel: 'student',
      tags: ['notifications', 'verification', 'certificates']
    },
    {
      id: 'email-5',
      question: 'What should I do if I don\'t receive an email?',
      answer: 'First, check your spam/junk folder for emails from ProCann Edu via Supabase. If not found, verify your email address is correct in your profile settings. You can also request a new verification email from your account dashboard.',
      category: 'Email Troubleshooting',
      securityLevel: 'student',
      tags: ['troubleshooting', 'spam', 'verification']
    },
    {
      id: 'email-6',
      question: 'How reliable is Supabase\'s email delivery?',
      answer: 'Supabase maintains 99.9% email delivery reliability with enterprise-grade infrastructure used by major companies. They provide real-time delivery monitoring, automatic retry mechanisms, and comprehensive spam protection.',
      category: 'Email Reliability',
      securityLevel: 'public',
      tags: ['reliability', 'delivery', 'enterprise']
    },
    {
      id: 'email-7',
      question: 'Can I trust clicking links in Supabase emails?',
      answer: 'Yes! All email links are cryptographically signed and verified. Supabase uses industry-standard security protocols to prevent tampering. Always verify the sender shows "ProCann Edu" and the domain matches our official communications.',
      category: 'Email Security',
      securityLevel: 'public',
      tags: ['security', 'links', 'verification']
    },
    {
      id: 'email-8',
      question: 'Who has access to manage our organization\'s email settings?',
      answer: 'Only ProCann Edu administrators can manage email settings. Supabase provides enterprise-grade access controls and audit logging. Your organization managers can view email delivery status but cannot modify system settings.',
      category: 'Email Management',
      securityLevel: 'manager',
      tags: ['access', 'permissions', 'audit']
    },
    
    // Session Security FAQs
    {
      id: 'session-1',
      question: 'Why did I get logged out?',
      answer: 'For your security, we automatically sign you out after 30 minutes of inactivity.',
      category: 'Session Security',
      securityLevel: 'public',
      tags: ['logout', 'inactivity', 'security']
    },
    {
      id: 'session-2',
      question: 'What counts as activity?',
      answer: 'Clicks, scrolling, typing, navigating through modules, and interacting with pages/quizzes all count as activity.',
      category: 'Session Security',
      securityLevel: 'public',
      tags: ['activity', 'session']
    },
    {
      id: 'session-3',
      question: "Will I lose my progress if I'm logged out?",
      answer: 'No. Your progress is saved as you go. After signing in again, use "Resume Course" to continue.',
      category: 'Session Security',
      securityLevel: 'public',
      tags: ['progress', 'save', 'resume']
    },
    {
      id: 'session-4',
      question: 'Will I be warned before logout?',
      answer: "Yes. You'll see a warning 5 minutes before logout with a countdown and a button to stay signed in.",
      category: 'Session Security',
      securityLevel: 'public',
      tags: ['warning', 'countdown']
    },
    {
      id: 'session-5',
      question: 'I had multiple tabs open—why did I get logged out?',
      answer: "If all tabs are inactive for 30 minutes, you'll be signed out. Activity in any open tab keeps you signed in.",
      category: 'Session Security',
      securityLevel: 'public',
      tags: ['tabs', 'multiple', 'sync']
    }
  ];

  // Filter FAQs based on user role and security level
  const getFilteredFAQs = (targetLevel: string): FAQItem[] => {
    let allowedLevels: string[] = ['public'];
    
    if (isAdmin) {
      allowedLevels = ['public', 'student', 'manager', 'admin'];
    } else if (isDispensaryManager) {
      allowedLevels = ['public', 'student', 'manager'];
    } else {
      allowedLevels = ['public', 'student'];
    }

    const levelFilter = targetLevel === 'general' ? allowedLevels : [targetLevel, 'public'];
    
    return faqData.filter(faq => {
      const hasAccess = levelFilter.includes(faq.securityLevel);
      const matchesSearch = !searchTerm || 
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return hasAccess && matchesSearch;
    });
  };

  const studentFAQs = useMemo(() => getFilteredFAQs('student'), [searchTerm, roles]);
  const managerFAQs = useMemo(() => getFilteredFAQs('manager'), [searchTerm, roles]);
  const adminFAQs = useMemo(() => getFilteredFAQs('admin'), [searchTerm, roles]);
  const generalFAQs = useMemo(() => getFilteredFAQs('general'), [searchTerm, roles]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Getting Started': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      'Course Access': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      'Certification': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      'Privacy & Security': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      'Manager Access': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      'Employee Management': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100',
      'Compliance Reporting': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      'User Management': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100',
      'System Analytics': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
      'About Training': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-100',
      'Pricing': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
      'Email Service': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
      'Email Security': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      'Email Types': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100',
      'Email Troubleshooting': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      'Email Reliability': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      'Email Management': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      'Session Security': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
  };

  const getSecurityIcon = (level: string) => {
    switch (level) {
      case 'admin': return <Shield className="h-3 w-3 text-red-600" />;
      case 'manager': return <Lock className="h-3 w-3 text-orange-600" />;
      case 'student': return <User className="h-3 w-3 text-blue-600" />;
      default: return <HelpCircle className="h-3 w-3 text-gray-600" />;
    }
  };

  const renderFAQSection = (faqs: FAQItem[], title: string, icon: React.ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-primary">
          {icon}
          <span className="ml-2">{title}</span>
          <Badge variant="outline" className="ml-auto">
            {t('faq.count', { count: faqs.length, defaultValue: `${faqs.length} questions` })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {faqs.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center justify-between w-full mr-4">
                    <span className="flex-1">{tr(faq.id, 'q', faq.question)}</span>
                    <div className="flex items-center gap-2 ml-2">
                      {getSecurityIcon(faq.securityLevel)}
                      <Badge className={getCategoryColor(faq.category)} variant="secondary">
                        {faq.category}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {tr(faq.id, 'a', faq.answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            {t('faq.empty', { defaultValue: 'No questions found matching your search or access level.' })}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div ref={contentRef} className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">
          {t('faq.header.title', { defaultValue: 'Frequently Asked Questions' })}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('faq.header.subtitle', {
            defaultValue: "Role-based help and support for ProCann Edu's cannabis training platform",
          })}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
          <ListenButton targetRef={contentRef} />
          {(isAdmin || isDispensaryManager) && (
            <Badge variant="outline">
              Advanced Access Level: {isAdmin ? 'Administrator' : 'Manager'}
            </Badge>
          )}
          {!isLoadingMetadata && lastUpdated && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </Badge>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder={t('faq.search.placeholder', { defaultValue: 'Search frequently asked questions...' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Contact Support */}
      <Card className="border-primary/20">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center text-primary">
            <HelpCircle className="mr-2 h-5 w-5" />
            {t('faq.contact.title', { defaultValue: 'Need Additional Help?' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center text-muted-foreground">
              <Mail className="mr-2 h-4 w-4 text-primary" />
              <span>info@procannedu.com</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="mr-2 h-4 w-4 text-primary" />
              <span>{t('faq.contact.hours', { defaultValue: 'Mon-Fri 9AM-6PM EST' })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="student" className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            {t('faq.tabs.students', { defaultValue: 'Students' })}
          </TabsTrigger>
          {(isDispensaryManager || isAdmin) && (
            <TabsTrigger value="dispensary" className="flex items-center">
              <Building2 className="mr-2 h-4 w-4" />
              {t('faq.tabs.managers', { defaultValue: 'Managers' })}
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              {t('faq.tabs.admins', { defaultValue: 'Admins' })}
            </TabsTrigger>
          )}
          <TabsTrigger value="general" className="flex items-center">
            <HelpCircle className="mr-2 h-4 w-4" />
            {t('faq.tabs.general', { defaultValue: 'General' })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="student">
          {renderFAQSection(studentFAQs, t('faq.section.student', { defaultValue: 'Student Questions' }), <User className="h-5 w-5" />)}
        </TabsContent>

        {(isDispensaryManager || isAdmin) && (
          <TabsContent value="dispensary">
            {renderFAQSection(managerFAQs, t('faq.section.manager', { defaultValue: 'Manager & Dispensary Questions' }), <Building2 className="h-5 w-5" />)}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin">
            {renderFAQSection(adminFAQs, t('faq.section.admin', { defaultValue: 'Administrator Questions' }), <Shield className="h-5 w-5" />)}
          </TabsContent>
        )}

        <TabsContent value="general">
          {renderFAQSection(generalFAQs, t('faq.section.general', { defaultValue: 'General Platform Questions' }), <HelpCircle className="h-5 w-5" />)}
        </TabsContent>
      </Tabs>
    </div>
  );
};
