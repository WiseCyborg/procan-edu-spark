import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, BookOpen, Shield, Award, Users, Lock, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useOrganizationAccess } from '@/hooks/useOrganizationAccess';
import { CoursePaymentGate } from '@/components/CoursePaymentGate';
import { EmployeeAccessMessage } from '@/components/EmployeeAccessMessage';
import { SecureVideoPlayer } from '@/components/video/SecureVideoPlayer';

const COURSE_ID = '76524ea8-a00f-47b3-8e29-a0aa12c23a60';

const TrainingHandbook = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isDispensaryManager, isStudent, isLoading: rolesLoading } = useUserRole();
  const { hasPaid, isLoading: paymentLoading } = usePaymentStatus(COURSE_ID);
  const { hasAccess: hasOrgAccess, isLoading: orgLoading } = useOrganizationAccess(user?.id);
  const [activeSection, setActiveSection] = useState<string>('section1');

  const sections = [
    { id: 'section1', title: 'Legal and Regulatory Foundations', icon: Shield },
    { id: 'section2', title: 'Operational and Safety Procedures', icon: BookOpen },
    { id: 'section3', title: 'Cannabis Pharmacology and Therapeutics', icon: FileText },
    { id: 'section4', title: 'Substance Use and Customer Safety', icon: Users },
    { id: 'section5', title: 'Responsible Vendor Training Program', icon: Award },
  ];

  const handleDownload = () => {
    window.print();
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const accessType = useMemo(() => {
    if (!user) return 'NEEDS_AUTH';
    if (isAdmin || isDispensaryManager) return 'ADMIN_ACCESS';
    if (isStudent && hasOrgAccess) return 'ORG_EMPLOYEE_ACCESS';
    if (isStudent && !hasOrgAccess) return 'NEEDS_ACCESS_KEY';
    if (hasPaid) return 'INDIVIDUAL_PAID';
    return 'NEEDS_PAYMENT';
  }, [user, isAdmin, isDispensaryManager, isStudent, hasOrgAccess, hasPaid]);

  const isLoading = rolesLoading || paymentLoading || orgLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Auth gate
  if (accessType === 'NEEDS_AUTH') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Sign In Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              The Training Handbook is available to enrolled students. Please sign in to access this resource.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access key gate for students without organization
  if (accessType === 'NEEDS_ACCESS_KEY') {
    return <EmployeeAccessMessage />;
  }

  // Payment gate for individual students
  if (accessType === 'NEEDS_PAYMENT') {
    return (
      <CoursePaymentGate
        course={{
          id: COURSE_ID,
          title: 'MCA Dispensary Agent Training',
          description: 'Complete Maryland Cannabis Administration training with access to the Training Handbook',
          price_cents: 4999,
          currency: 'USD',
          payment_required: true
        }}
        onPaymentSuccess={() => window.location.reload()}
      />
    );
  }

  // Full access for: ADMIN_ACCESS, ORG_EMPLOYEE_ACCESS, INDIVIDUAL_PAID
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-4">Official MCA Training Resource</Badge>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              MCA Dispensary Agent Training Handbook
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Welcome to the MCA Dispensary Agent Training Handbook, developed by ProCann to meet the rigorous standards of COMAR 14.17.05. This handbook is your comprehensive guide to fulfilling Maryland Cannabis Administration (MCA) training requirements for registered agents.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/course')} variant="default">
                <BookOpen className="w-4 h-4 mr-2" />
                Start Course
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download/Print PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Navigation */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto py-4">
            <div className="flex overflow-x-auto gap-2 scrollbar-hide">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    variant={activeSection === section.id ? 'default' : 'ghost'}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    Section {section.id.replace('section', '')}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Section 1 */}
          <section id="section1" className="scroll-mt-32">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-primary" />
                  <Badge>Section 1</Badge>
                </div>
                <CardTitle className="text-3xl">Legal and Regulatory Foundations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  As a registered dispensary agent, your role begins with a thorough understanding of the legal landscape. Under COMAR 14.17.05.A(1), you'll be trained annually on Federal and State cannabis laws, including Maryland's Alcoholic Beverages and Cannabis Article, §§36-1001—36-1003. ProCann's curriculum delves into these regulations, clarifying your responsibilities and the boundaries of cannabis commerce. We also cover the State's alcohol and drug-free workplace policy (COMAR 21.11.08.03) and other pertinent laws, ensuring you're equipped to operate within a compliant framework. This section sets the stage for your legal literacy in the industry.
                </p>
                <div className="rounded-lg overflow-hidden bg-muted">
                  <div className="aspect-video">
                    <SecureVideoPlayer assetKey="section_1_laws" lazy={false} />
                  </div>
                  <p className="text-sm text-muted-foreground text-center py-3">
                    <em>Video: Overview of Federal and Maryland cannabis laws for dispensary agents.</em>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Section 2 */}
          <section id="section2" className="scroll-mt-32">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <Badge>Section 2</Badge>
                </div>
                <CardTitle className="text-3xl">Operational and Safety Procedures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Day-to-day operations require mastery of standard procedures and safety protocols, as mandated by COMAR 14.17.05.A(2)—(6). This section teaches you ProCann's standard operating procedures (SOPs) for dispensary management, alongside techniques to detect and prevent cannabis diversion. You'll learn security measures to safeguard inventory and respond to emergencies like medical incidents, fires, chemical spills, and threatening events—such as armed robberies or burglaries. Our training emphasizes practical skills, from locking down a facility during an invasion to handling a customer in distress, ensuring safety for you and your workplace.
                </p>
                <div className="rounded-lg overflow-hidden bg-muted">
                  <div className="aspect-video">
                    <SecureVideoPlayer assetKey="section_2_sops" lazy={false} />
                  </div>
                  <p className="text-sm text-muted-foreground text-center py-3">
                    <em>Video: Demonstration of security procedures and emergency responses.</em>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Section 3 */}
          <section id="section3" className="scroll-mt-32">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-primary" />
                  <Badge>Section 3</Badge>
                </div>
                <CardTitle className="text-3xl">Cannabis Pharmacology and Therapeutics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  ProCann's expertise shines in this annual training requirement (COMAR 14.17.05, Dispensary Agent Topics 2—5). You'll explore the pharmacology of cannabis, focusing on active components like THC and CBD, and their potential therapeutic benefits and adverse effects. This section covers dosage forms—edibles, tinctures, topicals—and their pharmacodynamic impacts, alongside potential drug interactions and consumer safety concerns. Our goal is to make you a knowledgeable resource for customers, able to explain how cannabis interacts with the body and address common questions about its use.
                </p>
                <div className="rounded-lg overflow-hidden bg-muted">
                  <div className="aspect-video">
                    <iframe 
                      src="https://player.vimeo.com/video/1073072073?h=39cef65ffc&title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" 
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      title="Section 3: Cannabis Pharmacology and Therapeutics"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center py-3">
                    <em>Video: Understanding cannabis active components and dosage forms.</em>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Section 4 */}
          <section id="section4" className="scroll-mt-32">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-primary" />
                  <Badge>Section 4</Badge>
                </div>
                <CardTitle className="text-3xl">Substance Use and Customer Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Recognizing and addressing substance use issues is critical for dispensary agents, as outlined in COMAR 14.17.05, Topic 6. This section trains you to identify symptoms of substance use disorders and acute intoxication in customers, ensuring you can respond appropriately—whether by limiting sales or offering support resources. ProCann emphasizes consumer safety, teaching you how to spot red flags, educate clients on responsible use, and maintain a safe retail environment. This knowledge protects both your customers and your license's integrity.
                </p>
                <div className="rounded-lg overflow-hidden bg-muted">
                  <div className="aspect-video">
                    <iframe 
                      src="https://player.vimeo.com/video/1073072091?h=f75482ba3d&title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" 
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      title="Section 4: Substance Use and Customer Safety"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center py-3">
                    <em>Video: Identifying signs of intoxication and substance use disorders.</em>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Section 5 */}
          <section id="section5" className="scroll-mt-32">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-6 h-6 text-primary" />
                  <Badge>Section 5</Badge>
                </div>
                <CardTitle className="text-3xl">Responsible Vendor Training Program</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Beyond annual requirements, COMAR 14.17.05.C mandates a separate Responsible Vendor Training Program, which ProCann proudly offers in compliance with §§36-1001—36-1003. This section prepares you for certification by covering advanced customer service, sales ethics, and regulatory adherence. Approved by the MCA for three years (COMAR 14.17.05.E(3)), our program ensures you meet minimum educational standards while enhancing your professional skills. We maintain records for four years, as required, making compliance seamless for you and your employer.
                </p>
                <div className="rounded-lg overflow-hidden bg-muted">
                  <div className="aspect-video">
                    <iframe 
                      src="https://player.vimeo.com/video/1073072103?h=44ce932241&title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" 
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      title="Section 5: Responsible Vendor Training Program"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center py-3">
                    <em>Video: Key elements of the Responsible Vendor Training Program.</em>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Footer CTA */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="text-center py-8">
              <h3 className="text-2xl font-bold mb-4">Ready to Start Your Training?</h3>
              <p className="text-muted-foreground mb-6">
                Access the full course with interactive modules, quizzes, and earn your MCA certification.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={() => navigate('/course')} size="lg">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Begin Course
                </Button>
                <Button onClick={handleDownload} variant="outline" size="lg">
                  <Download className="w-5 h-5 mr-2" />
                  Download Handbook
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrainingHandbook;
