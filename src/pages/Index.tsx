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

import { useABTest } from '@/hooks/useABTest';
import { RoleSelectorModal } from '@/components/RoleSelectorModal';
import { InvestmentValueCard } from '@/components/InvestmentValueCard';
import { ComplianceDisclaimer } from '@/components/ComplianceDisclaimer';
import { SwipeUpIndicator } from '@/components/SwipeUpIndicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { Seo } from '@/components/Seo';
const Index = () => {

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = React.useState(false);

  // A/B Test for hero headline - honest, verifiable claims only
  const {
    variant: heroMessage
  } = useABTest({
    testName: 'hero_headline',
    variants: [{
      id: 'comar_aligned',
      value: "COMAR-Aligned Maryland RVT Certification Training",
      weight: 1
    }, {
      id: 'comprehensive_training',
      value: "Comprehensive Maryland RVT Training • 24 Modules • Self-Paced",
      weight: 1
    }, {
      id: 'maryland_focused',
      value: "Maryland RVT Certification Built by Local Cannabis Professionals",
      weight: 1
    }, {
      id: 'accessible_pricing',
      value: "Complete Maryland RVT Training • $49.99 • Under MD Maximum",
      weight: 1
    }]
  });
  return <div className="min-h-screen">
      <Seo
        title="ProCann Edu — Maryland RVT Certification Training"
        description="Maryland's AI-powered Responsible Vendor Training. State-aligned cannabis dispensary certification, team management, and compliance reporting in one platform."
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'ProCann Edu',
            url: 'https://www.procannedu.com/',
            logo: 'https://www.procannedu.com/favicon-procann.jpg',
            sameAs: ['https://procannedu.com'],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'ProCann Edu',
            url: 'https://www.procannedu.com/',
          },
        ]}
      />

      <AccessibilityToolbar />
      
      {/* Mobile-First Optimized Hero Section - Above Fold */}
      <section className={`relative flex items-center justify-center overflow-hidden ${isMobile ? 'min-h-[75vh] py-4' : 'min-h-screen py-16'}`}>
        {/* Animated Maryland Bay Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-[hsl(174,76%,36%)] to-accent animate-maryland-bay-flow" style={{
        backgroundSize: '200% 200%'
      }}></div>
        
        {/* Maryland Flag Color Accent Stripes */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/5 via-transparent to-amber-500/5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,215,0,0.03) 35px, rgba(255,215,0,0.03) 70px)'
      }}></div>
        
        {/* Decorative overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNEgxNHYtMjBoMjJ2MjB6bS0yMi0yMEgwdjIwaDE0di0yMHptMCAyMEgwdjE0aDE0di0xNHptMjIgMEgxNHYxNGgyMnYtMTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>
        
        {/* Shimmer Effect - passes every 10 seconds */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-pass" style={{
          width: '50%',
          transform: 'translateX(-100%) skewX(-15deg)'
        }} />
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

          {/* Main Logo and Value Proposition */}
          <div className={`text-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <h1 className={`font-bold text-white leading-tight ${isMobile ? 'text-3xl mb-2' : 'text-5xl md:text-6xl mb-3'}`}>
              ProCann Edu
            </h1>
            <p className={`text-white font-medium mx-auto leading-snug ${isMobile ? 'text-lg max-w-sm px-2' : 'text-2xl md:text-3xl max-w-3xl'}`}>
              Maryland cannabis training & certification
            </p>
            <p className={`text-white/90 mx-auto ${isMobile ? 'text-sm mt-2' : 'text-lg mt-3 max-w-2xl'}`}>
              Official Maryland Responsible Vendor Training (RVT) — <span className="font-semibold">$49.99</span>, self-paced, COMAR-aligned.
            </p>
          </div>

          {/* Welcome Video Section - Desktop Only (keeps mobile CTA above fold) */}
          {!isMobile && (
            <WelcomeVideoSection className="mb-6" />
          )}

          {/* Primary CTA + Secondary Link */}
          <div className={`text-center ${isMobile ? 'mb-3' : 'mb-5'}`}>
            <Button
              onClick={() => navigate('/get-started')}
              size={isMobile ? 'default' : 'lg'}
              className={`bg-white text-primary hover:bg-white/90 font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 ${isMobile ? 'w-full px-6 py-5 text-base h-auto' : 'px-10 py-6 text-lg'}`}
            >
              Get Certified — $49.99
            </Button>
            <div className="mt-3">
              <button
                onClick={() => navigate('/verify-certificate')}
                className={`text-white/80 hover:text-white underline underline-offset-4 transition-colors ${isMobile ? 'text-xs' : 'text-sm'}`}
              >
                Verify a certificate
              </button>
            </div>
          </div>

          {/* Trust Strip */}
          <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-white/85 ${isMobile ? 'text-xs mb-2' : 'text-sm mb-4'}`}>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> COMAR-aligned</span>
            <span className="opacity-50">•</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Maryland-focused</span>
            <span className="opacity-50">•</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Certificate verification</span>
          </div>

          {/* Desktop secondary links */}
          {!isMobile && (
            <div className="flex flex-wrap justify-center gap-4 text-white/70 text-sm">
              <button onClick={() => navigate('/faq')} className="hover:text-white transition-colors underline">
                FAQ
              </button>
              <span>•</span>
              <a href="mailto:info@procannedu.com" className="hover:text-white transition-colors underline">
                Contact us
              </a>
            </div>
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

      {/* Three Training Paths Section */}
      <section className={`bg-gradient-to-br from-muted/50 to-background ${isMobile ? 'py-10 px-4' : 'py-20 px-4'}`}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className={`font-bold text-foreground ${isMobile ? 'text-2xl mb-3' : 'text-4xl mb-4'}`}>
              Choose Your Training Path
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three distinct programs designed for different needs — from compliance certification to public education
            </p>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-3 gap-6'}`}>
            {/* RVT Core */}
            <div 
              className="relative bg-white dark:bg-card border-2 border-primary/30 rounded-xl p-6 hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => navigate('/get-started')}
            >
              <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-semibold">
                Required for Employees
              </div>
              <div className="pt-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">RVT Core Training</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Official Maryland Responsible Vendor Training certification for dispensary employees.
                </p>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span><strong>18 modules</strong> • 4-6 hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Requires <strong>join code</strong> from employer</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span>Issues <strong>RVT Certificate</strong></span>
                  </div>
                </div>
                <Button className="w-full group-hover:bg-primary/90" onClick={(e) => { e.stopPropagation(); navigate('/auth?role=student'); }}>
                  Start RVT Training
                </Button>
              </div>
            </div>

            {/* Manager Track */}
            <div 
              className="relative bg-white dark:bg-card border-2 border-amber-500/30 rounded-xl p-6 hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => navigate('/get-started')}
            >
              <div className="absolute -top-3 left-4 bg-amber-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                Optional Add-On
              </div>
              <div className="pt-4">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Manager Track</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Advanced leadership training for dispensary managers and supervisors.
                </p>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span><strong>5 modules</strong> • 2-3 hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>Requires <strong>RVT completion</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span>Issues <strong>Manager Certificate</strong></span>
                  </div>
                </div>
                <Button variant="outline" className="w-full border-amber-500 text-amber-600 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); navigate('/auth?role=training_coordinator'); }}>
                  Access Manager Track
                </Button>
              </div>
            </div>

            {/* Public Learning */}
            <div 
              className="relative bg-white dark:bg-card border-2 border-secondary/30 rounded-xl p-6 hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => navigate('/learn')}
            >
              <div className="absolute -top-3 left-4 bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full font-semibold">
                Free & Open
              </div>
              <div className="pt-4">
                <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <svg className="h-7 w-7 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Public Learning</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn how Maryland dispensaries work. Open to everyone, 100% free.
                </p>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    <span><strong>8-12 modules</strong> • Self-paced</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span><strong>Open access</strong> — no account required</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Issues <strong>Completion Badge</strong> (non-RVT)</span>
                  </div>
                </div>
                <Button variant="secondary" className="w-full" onClick={(e) => { e.stopPropagation(); navigate('/learn'); }}>
                  Start Free Learning
                </Button>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground max-w-3xl mx-auto">
              <strong>Note:</strong> Only RVT Core Training provides official Maryland Responsible Vendor Training certification 
              as required by COMAR 14.17.05. Public Learning is for educational purposes only and does not satisfy employee compliance requirements.
            </p>
          </div>
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
                  <li><strong>Modules:</strong> 24 comprehensive modules</li>
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
                <li><a href="/ailean-info" className="text-gray-400 hover:text-white">✋ AiLean AI Coach</a></li>
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
              <a href="/mca-compliance-review" className="text-white/80 hover:text-white underline text-xs">
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
      <RoleSelectorModal open={isRoleSelectorOpen} onOpenChange={setIsRoleSelectorOpen} />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />
      <ExitIntentModal />
      
    </div>;
};
export default Index;