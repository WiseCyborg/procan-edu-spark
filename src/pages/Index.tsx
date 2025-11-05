
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Shield, CheckCircle, Building2, Waves, Users, Leaf, UserCog } from 'lucide-react';
import { CoursePreviewSystem } from '@/components/EnhancedCoursePreview';
import { AccessibilityToolbar } from '@/components/MobileOptimization';
import { TrustStats, ComplianceBadges, TestimonialCarousel } from '@/components/TrustIndicators';
import { HoverCallout } from '@/components/ui/hover-callout';
import { WelcomeVideoSection } from '@/components/WelcomeVideoSection';
import { LiveCOMARBadge } from '@/components/LiveCOMARBadge';
import { ROIHighlightCard } from '@/components/ROIHighlightCard';
import { LiveActivityTicker } from '@/components/LiveActivityTicker';
import { MarylandCountyHeatmap } from '@/components/MarylandCountyHeatmap';
import { StickyMobileCTA } from '@/components/StickyMobileCTA';
import { PredictiveAnalyticsPreview } from '@/components/PredictiveAnalyticsPreview';
import { ExitIntentModal } from '@/components/ExitIntentModal';
import { AIFAQChat } from '@/components/AIFAQChat';
import { useABTest } from '@/hooks/useABTest';
import { RoleSelectorModal } from '@/components/RoleSelectorModal';
import { InvestmentValueCard } from '@/components/InvestmentValueCard';
import { ComplianceDisclaimer } from '@/components/ComplianceDisclaimer';

const Index = () => {
  const navigate = useNavigate();
  
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = React.useState(false);

  // A/B Test for hero headline
  const { variant: heroMessage } = useABTest({
    testName: 'hero_headline',
    variants: [
      {
        id: 'ai_maryland_focus',
        value: "Maryland's ONLY AI-Powered, COMAR-Embedded RVT Training Platform",
        weight: 1,
      },
      {
        id: 'roi_savings_focus',
        value: "Save $12K+ Annually with Maryland's Most Advanced RVT Training",
        weight: 1,
      },
      {
        id: 'compliance_speed_focus',
        value: "Get COMAR-Certified in 4-6 Hours with 87% Pass Rate Guarantee",
        weight: 1,
      },
      {
        id: 'mca_professional_aligned',
        value: "MCA-Aligned Maryland RVT Training with Real-Time Regulatory Updates",
        weight: 1,
      },
    ],
  });

  return (
    <div className="min-h-screen">
      <AccessibilityToolbar />
      
      {/* Humanized Hero Section with Welcome Video */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-16">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent"></div>
        
        {/* Decorative overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNEgxNHYtMjBoMjJ2MjB6bS0yMi0yMEgwdjIwaDE0di0yMHptMCAyMEgwdjE0aDE0di0xNHptMjIgMEgxNHYxNGgyMnYtMTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>

        <div className="relative z-10 container mx-auto px-4">
          {/* Live COMAR Badge */}
          <LiveCOMARBadge />

          {/* Main Logo and Tagline - Simplified Hero */}
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 leading-tight">
              ProCann Edu
            </h1>
            <h2 className="text-2xl md:text-3xl gradient-text font-medium max-w-3xl mx-auto leading-relaxed">
              {heroMessage}
            </h2>
            <p className="text-lg text-white/90 mt-4 max-w-2xl mx-auto">
              Complete Maryland RVT certification in 4-6 hours • 87% pass rate • $49.99
            </p>
          </div>

          {/* Welcome Video Section */}
          <WelcomeVideoSection 
            videoUrl="https://vimeo.com/1096146284/e90b8e5dfc"
            className="mb-12"
          />

          {/* Single Primary CTA */}
          <div className="text-center mb-8">
            <Button 
              onClick={() => setIsRoleSelectorOpen(true)}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              Start Your Maryland RVT Certification - $49.99
            </Button>
            <p className="text-white/70 text-sm mt-3">
              Choose your path: Student • Team Manager • Dispensary Owner
            </p>
          </div>

          {/* Or see all options link */}
          <div className="text-center mb-4">
            <Button
              variant="link"
              onClick={() => navigate('/get-started')}
              className="text-white/90 hover:text-white underline"
            >
              Not sure? See all registration options →
            </Button>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 text-white/80 text-sm">
            <button 
              onClick={() => navigate('/faq')}
              className="hover:text-white transition-colors underline"
            >
              Questions? Check our FAQ
            </button>
            <span>•</span>
            <button 
              onClick={() => navigate('/verify-certificate')}
              className="hover:text-white transition-colors underline"
            >
              Verify a Certificate
            </button>
            <span>•</span>
            <a 
              href="mailto:info@procannedu.com"
              className="hover:text-white transition-colors underline"
            >
              Chat with us
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof Section - First Scroll */}
      <section className="py-12 px-4 bg-white dark:bg-background">
        <div className="container mx-auto">
          <TrustStats />
        </div>
      </section>

      {/* Investment Value Section */}
      <section className="py-12 px-4 bg-gradient-to-br from-primary/5 to-accent/10">
        <div className="container mx-auto">
          <InvestmentValueCard />
        </div>
      </section>

      {/* Live Activity Ticker */}
      <LiveActivityTicker />

      {/* ROI Outcomes Section */}
      <section className="py-12 px-4 bg-white dark:bg-background">
        <div className="container mx-auto">
          <ROIHighlightCard />
        </div>
      </section>

      {/* Maryland First Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/5 to-accent/10">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Built in Maryland, for Maryland
          </h3>
          <div className="max-w-4xl mx-auto mb-8">
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Created by local educators, cannabis professionals, and community advocates who know and love our state. 
              We understand Maryland because <strong>we are Maryland</strong>.
            </p>
            
            {/* Maryland Icon Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="relative overflow-hidden group hover:scale-105 transition-transform duration-300 h-48 flex items-center justify-center bg-gradient-to-br from-red-600 to-red-700 border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <Building2 className="h-16 w-16 text-white mx-auto mb-3" />
                  <p className="text-white text-sm font-medium">State House Heritage</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:scale-105 transition-transform duration-300 h-48 flex items-center justify-center bg-gradient-to-br from-amber-500 to-yellow-600 border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <Waves className="h-16 w-16 text-white mx-auto mb-3" />
                  <p className="text-white text-sm font-medium">Chesapeake Bay</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:scale-105 transition-transform duration-300 h-48 flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700 border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <Users className="h-16 w-16 text-white mx-auto mb-3" />
                  <p className="text-white text-sm font-medium">Community Focused</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:scale-105 transition-transform duration-300 h-48 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 border-none shadow-lg hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <Leaf className="h-16 w-16 text-white mx-auto mb-3" />
                  <p className="text-white text-sm font-medium">Cannabis Expertise</p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Button 
            size="lg" 
            onClick={() => navigate('/stoplight-standard')}
            className="bg-stoplight-green hover:bg-stoplight-green/90 text-white font-poppins"
          >
            Learn the Stoplight Standard™
          </Button>
        </div>
      </section>

      {/* Maryland Partnership Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Trusted by Maryland's Cannabis Community
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Official partnerships and endorsements from Maryland's cannabis industry leaders
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 items-center justify-items-center max-w-4xl mx-auto">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow w-full">
              <Shield className="h-12 md:h-16 w-12 md:w-16 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-sm md:text-base">MCA Approved</p>
              <p className="text-xs text-muted-foreground mt-1">Maryland Cannabis Administration</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow w-full">
              <Building2 className="h-12 md:h-16 w-12 md:w-16 text-blue-600 mx-auto mb-3" />
              <p className="font-semibold text-sm md:text-base">24 Counties</p>
              <p className="text-xs text-muted-foreground mt-1">Statewide Coverage</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow w-full">
              <Users className="h-12 md:h-16 w-12 md:w-16 text-purple-600 mx-auto mb-3" />
              <p className="font-semibold text-sm md:text-base">150+ Dispensaries</p>
              <p className="text-xs text-muted-foreground mt-1">Active Partners</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow w-full">
              <Award className="h-12 md:h-16 w-12 md:w-16 text-yellow-600 mx-auto mb-3" />
              <p className="font-semibold text-sm md:text-base">2,500+ Certified</p>
              <p className="text-xs text-muted-foreground mt-1">Maryland Agents</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white dark:bg-background">
        <div className="container mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            What Makes Us Different?
          </h3>
          <p className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            We're not just another training platform. We're your partners in success. 🤝
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <HoverCallout content="Our training program is aligned to Maryland Cannabis Administration RVT standards under COMAR 14.17 and is regularly updated to reflect the latest compliance requirements.">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-help">
                <CardHeader>
                  <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <CardTitle className="text-lg">Aligned to MCA Standards</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Built to Maryland Cannabis Administration RVT requirements (COMAR 14.17)
                  </p>
                </CardContent>
              </Card>
            </HoverCallout>

            <HoverCallout content="Our comprehensive curriculum includes 18 detailed modules covering cannabis laws, safety protocols, patient care, inventory management, and quality control standards.">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-help">
                <CardHeader>
                  <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-lg">Comprehensive Training</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    18 modules covering all aspects of cannabis regulations and operations
                  </p>
                </CardContent>
              </Card>
            </HoverCallout>

            <HoverCallout content="Upon successful completion of the course and final exam, you'll receive an official certificate that meets Maryland RVT training standards under COMAR 14.17.">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-help">
                <CardHeader>
                  <Award className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                  <CardTitle className="text-lg">Official Certificates</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Earn recognized certificates upon successful course completion
                  </p>
                </CardContent>
              </Card>
            </HoverCallout>

            <HoverCallout content="Access your training materials anytime, anywhere. Our platform is mobile-friendly and allows you to study at your own pace with automatic progress saving.">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-help">
                <CardHeader>
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <CardTitle className="text-lg">Easy Online Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Study at your own pace with 24/7 online access
                  </p>
                </CardContent>
              </Card>
            </HoverCallout>
          </div>
        </div>
      </section>

      {/* Maryland County Heatmap */}
      <MarylandCountyHeatmap />

      {/* Predictive Analytics Preview Section */}
      <PredictiveAnalyticsPreview />

      {/* Course Overview */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-8">
              Maryland Responsible Vendor Training (RVT)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-semibold text-green-700 mb-4">What You'll Learn</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Maryland cannabis laws and regulations
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Responsible vendor practices
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Patient safety and compliance
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Security and inventory management
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Quality control standards
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xl font-semibold text-green-700 mb-4">Course Details</h4>
                <ul className="space-y-2 text-gray-600">
                  <li><strong>Duration:</strong> Self-paced (typically 4-6 hours)</li>
                  <li><strong>Modules:</strong> 18 comprehensive modules</li>
                  <li><strong>Exam:</strong> Final certification exam</li>
                  <li><strong>Certificate:</strong> Valid through 2025</li>
                  <li><strong>Access:</strong> 24/7 online availability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Course Preview */}
      <section className="py-16 px-4 bg-gray-50">
        <CoursePreviewSystem />
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary to-accent">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            You've Got This! 🎉
          </h3>
          <p className="text-xl text-white/95 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join our community of cannabis professionals who started right where you are. 
            We'll be with you every step of the way.
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            Start Your Journey Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 pb-8 border-b border-white/10">
            <h3 className="text-2xl font-bold mb-2">ProCann Edu</h3>
            <p className="text-xl text-white/90 mb-2">Maryland's Trusted RVT Provider</p>
            <p className="text-white/70">Headquarters: Baltimore, Maryland</p>
            <p className="text-white/70">Serving dispensaries across all 24 counties</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h5 className="font-semibold mb-3">For Students</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/auth" className="text-gray-400 hover:text-white">Get Started</a></li>
                <li><a href="/faq" className="text-gray-400 hover:text-white">FAQ</a></li>
                <li><a href="/training-handbook" className="text-gray-400 hover:text-white">Training Handbook</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-3">For Organizations</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/org/apply" className="text-gray-400 hover:text-white">Dispensary Application</a></li>
                <li><a href="/employers" className="text-gray-400 hover:text-white">Verify Certificates</a></li>
                <li><a href="/purchase-seats" className="text-gray-400 hover:text-white">Purchase Training Seats</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-3">Compliance</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/state-officials" className="text-gray-400 hover:text-white">For State Officials</a></li>
                <li><a href="/compliance/curriculum-matrix" className="text-gray-400 hover:text-white">COMAR Compliance Matrix</a></li>
                <li><a href="/compliance/content-review" className="text-gray-400 hover:text-white">Content Review Process</a></li>
                <li><a href="/accessibility" className="text-gray-400 hover:text-white">Accessibility Statement</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-3">About</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/about/team" className="text-gray-400 hover:text-white">Meet Our Team</a></li>
                <li><a href="/impact" className="text-gray-400 hover:text-white">Our Impact</a></li>
                <li><a href="/verify-certificate" className="text-gray-400 hover:text-white">Verify Certificate</a></li>
                <li><a href="mailto:compliance@procannedu.com" className="text-gray-400 hover:text-white">compliance@procannedu.com</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center text-sm text-white/60 pt-8 border-t border-white/10">
            <p>&copy; 2025 ProCann Edu. All rights reserved.</p>
            <p className="mt-2">Made with 💚 in Maryland</p>
            <div className="mt-6">
              <a 
                href="/mca-compliance-review"
                className="text-white/80 hover:text-white underline text-xs"
              >
                For MCA Officials: View Compliance Documentation
              </a>
            </div>
          </div>
          
          {/* Compliance Disclaimers */}
          <div className="mt-8 pt-8 border-t border-white/10 max-w-4xl mx-auto">
            <h4 className="text-white font-semibold mb-4 text-center">Regulatory Compliance & Data Substantiation</h4>
            <ComplianceDisclaimer />
          </div>
        </div>
      </footer>

      {/* Role Selector Modal */}
      <RoleSelectorModal 
        open={isRoleSelectorOpen}
        onOpenChange={setIsRoleSelectorOpen}
      />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />
      <ExitIntentModal />
      <AIFAQChat />
    </div>
  );
};

export default Index;
