
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { CoursePreviewSystem } from '@/components/EnhancedCoursePreview';
import { AccessibilityToolbar } from '@/components/MobileOptimization';
import { TrustStats } from '@/components/TrustIndicators';
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
import { SwipeUpIndicator } from '@/components/SwipeUpIndicator';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
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
      
      {/* Mobile-First Optimized Hero Section - Above Fold */}
      <section className={`relative flex items-center justify-center overflow-hidden ${isMobile ? 'min-h-[75vh] py-4' : 'min-h-screen py-16'}`}>
        {/* Animated Maryland Bay Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-[hsl(174,76%,36%)] to-accent animate-maryland-bay-flow" style={{ backgroundSize: '200% 200%' }}></div>
        
        {/* Maryland Flag Color Accent Stripes */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/5 via-transparent to-amber-500/5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,215,0,0.03) 35px, rgba(255,215,0,0.03) 70px)' }}></div>
        
        {/* Decorative overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNEgxNHYtMjBoMjJ2MjB6bS0yMi0yMEgwdjIwaDE0di0yMHptMCAyMEgwdjE0aDE0di0xNHptMjIgMEgxNHYxNGgyMnYtMTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>
        
        {/* Shimmer Effect - passes every 10 seconds */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-pass" 
            style={{ 
              width: '50%',
              transform: 'translateX(-100%) skewX(-15deg)' 
            }}
          />
        </div>
        
        {/* 24 Counties Badge */}
        <div className={`absolute ${isMobile ? 'top-4 right-4 text-xs px-3 py-1.5' : 'top-8 right-8 px-4 py-2 text-sm'} bg-white/10 backdrop-blur-md rounded-full text-white font-medium animate-float`}>
          🗺️ Serving All 24 Maryland Counties
        </div>

        <div className="relative z-10 container mx-auto px-4">
          {/* Live COMAR Badge - Subtle Placement */}
          <div className={`flex justify-center ${isMobile ? 'mb-3 scale-75' : 'mb-6'}`}>
            <LiveCOMARBadge />
          </div>

          {/* Main Logo and Tagline - Level 1 Typography */}
          <div className={`text-center ${isMobile ? 'mb-3' : 'mb-8'}`}>
            <h1 className={`font-bold text-white leading-tight ${isMobile ? 'text-4xl mb-2' : 'text-5xl md:text-7xl mb-4'}`}>
              ProCann Edu
            </h1>
            <h2 className={`gradient-text font-medium mx-auto leading-relaxed ${isMobile ? 'text-base max-w-sm px-2' : 'text-2xl md:text-3xl max-w-3xl'}`}>
              {isMobile ? "Maryland's AI-Powered RVT Certification" : heroMessage}
            </h2>
            {!isMobile && (
              <p className="text-lg text-white/90 mt-4 max-w-2xl mx-auto">
                Complete Maryland RVT certification in 4-6 hours • 87% pass rate • $49.99
              </p>
            )}
          </div>

          {/* Welcome Video Section */}
          <WelcomeVideoSection 
            videoUrl="https://vimeo.com/1096146284/e90b8e5dfc"
            className={isMobile ? 'mb-3' : 'mb-8'}
          />

          {/* Single Primary CTA */}
          <div className={`text-center ${isMobile ? 'mb-2' : 'mb-6'}`}>
            <Button 
              onClick={() => setIsRoleSelectorOpen(true)}
              size={isMobile ? 'default' : 'lg'}
              className={`bg-white text-primary hover:bg-white/90 font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 ${
                isMobile ? 'w-full px-6 py-6 text-base h-auto' : 'px-8 py-6 text-lg'
              }`}
            >
              {isMobile ? 'Get Certified - $49.99' : 'Start Your Maryland RVT Certification - $49.99'}
            </Button>
            <p className={`text-white/70 mt-3 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {isMobile ? '✓ 4-6 hrs ✓ AI tracking ✓ Lifetime access' : 'Choose your path: Student • Team Manager • Dispensary Owner'}
            </p>
          </div>

          {/* Quick Links - Desktop Only */}
          {!isMobile && (
            <>
              <div className="text-center mb-4">
                <Button
                  variant="link"
                  onClick={() => navigate('/get-started')}
                  className="text-white/90 hover:text-white underline text-sm"
                >
                  Not sure? See all registration options →
                </Button>
              </div>

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
            </>
          )}

          {/* Swipe Up Indicator - Mobile Only */}
          <SwipeUpIndicator />
        </div>
      </section>

      {/* First Scroll - Social Proof & Value */}
      <section className={`bg-white dark:bg-background ${isMobile ? 'py-8 px-4' : 'py-16 px-4'}`}>
        <div className="container mx-auto">
          <TrustStats />
        </div>
      </section>

      {/* Investment Value Section */}
      <section className={`bg-gradient-to-br from-primary/5 to-accent/10 ${isMobile ? 'py-8 px-4' : 'py-16 px-4'}`}>
        <div className="container mx-auto">
          <InvestmentValueCard />
        </div>
      </section>

      {/* Live Activity Ticker */}
      <LiveActivityTicker />

      {/* Second Scroll - ROI Outcomes */}
      <section className={`bg-white dark:bg-background ${isMobile ? 'py-8 px-4' : 'py-16 px-4'}`}>
        <div className="container mx-auto">
          <ROIHighlightCard />
        </div>
      </section>

      {/* Course Overview - Level 2 Typography */}
      <section className={`bg-gradient-to-br from-primary/5 to-accent/10 ${isMobile ? 'py-8 px-4' : 'py-16 px-4'}`}>
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <h3 className={`font-bold text-center text-foreground ${isMobile ? 'text-2xl mb-6' : 'text-3xl md:text-4xl mb-8'}`}>
              Maryland Responsible Vendor Training (RVT)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className={`font-semibold text-primary ${isMobile ? 'text-lg mb-3' : 'text-xl mb-4'}`}>What You'll Learn</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                    <span>Maryland cannabis laws and regulations</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                    <span>Responsible vendor practices</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                    <span>Patient safety and compliance</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                    <span>Security and inventory management</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                    <span>Quality control standards</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className={`font-semibold text-primary ${isMobile ? 'text-lg mb-3' : 'text-xl mb-4'}`}>Course Details</h4>
                <ul className="space-y-2 text-muted-foreground">
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

      {/* Course Preview System */}
      <section className={`bg-white dark:bg-background ${isMobile ? 'py-8 px-4' : 'py-16 px-4'}`}>
        <CoursePreviewSystem />
      </section>

      {/* Third Scroll - Geographic & Technology Proof */}
      <MarylandCountyHeatmap />

      <PredictiveAnalyticsPreview />

      {/* Footer with Compliance */}
      <footer className={`bg-foreground text-white ${isMobile ? 'py-8 px-4' : 'py-12 px-4'}`}>
        <div className="container mx-auto">
          <div className="text-center mb-8 pb-8 border-b border-white/10">
            <h3 className={`font-bold mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>ProCann Edu</h3>
            <p className={`text-white/90 mb-2 ${isMobile ? 'text-base' : 'text-xl'}`}>Maryland's Trusted RVT Provider</p>
            <p className={`text-white/70 ${isMobile ? 'text-sm' : 'text-base'}`}>Headquarters: Baltimore, Maryland</p>
            <p className={`text-white/70 ${isMobile ? 'text-sm' : 'text-base'}`}>Serving dispensaries across all 24 counties</p>
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
