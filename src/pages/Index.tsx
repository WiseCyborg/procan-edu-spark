
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Shield, CheckCircle, Building2, Waves, Users, Leaf } from 'lucide-react';
import { CoursePreviewSystem } from '@/components/EnhancedCoursePreview';
import { AccessibilityToolbar } from '@/components/MobileOptimization';
import { TrustStats, ComplianceBadges, TestimonialCarousel } from '@/components/TrustIndicators';
import { HoverCallout } from '@/components/ui/hover-callout';
import { WelcomeVideoSection } from '@/components/WelcomeVideoSection';

const Index = () => {
  const navigate = useNavigate();

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
          {/* Top welcome message */}
          <div className="text-center mb-8">
            <p className="text-white/90 text-lg font-medium">
              Welcome! Let's get you certified. 👋
            </p>
          </div>

          {/* Compliance Badges */}
          <ComplianceBadges />

          {/* Main Logo and Tagline */}
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 leading-tight">
              ProCann Edu
            </h1>
            <h2 className="text-2xl md:text-3xl text-white/95 font-medium max-w-3xl mx-auto leading-relaxed">
              Your friendly guide to becoming a certified cannabis professional in Maryland
            </h2>
          </div>

          {/* Welcome Video Section */}
          <WelcomeVideoSection 
            videoUrl="https://vimeo.com/1096146284/e90b8e5dfc"
            className="mb-12"
          />

          {/* Humanized Value Proposition */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 mb-10 max-w-3xl mx-auto">
            <p className="text-xl text-white/95 leading-relaxed text-center">
              Join <strong>2,500+ fellow Marylanders</strong> on the path to cannabis certification. 
              <br className="hidden md:block" />
              We're in this together! 🌱
            </p>
            <p className="text-white/80 mt-4 text-center">
              No question is too small. We're here to help you succeed, not just check boxes.
            </p>
          </div>

          {/* Trust Statistics */}
          <TrustStats />

          {/* Testimonial */}
          <div className="mb-10">
            <TestimonialCarousel />
          </div>
          
          {/* Humanized CTA Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
            <Button 
              onClick={() => navigate('/auth?role=dispensary')}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 px-8 py-4 h-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Building2 className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div>For Dispensary Owners</div>
                <div className="text-sm font-normal opacity-80">Manage your team's training</div>
              </div>
            </Button>

            <Button 
              onClick={() => navigate('/auth?role=student')}
              variant="outline"
              size="lg"
              className="border-2 border-white/60 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-8 py-4 h-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Award className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div>I'm a Student</div>
                <div className="text-sm font-normal opacity-90">Start my certification</div>
              </div>
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

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            What Makes Us Different?
          </h3>
          <p className="text-center text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            We're not just another training platform. We're your partners in success. 🤝
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <HoverCallout content="Our training program meets all Maryland Cannabis Administration regulatory requirements and is regularly updated to reflect the latest compliance standards.">
              <Card className="text-center hover:shadow-lg transition-shadow cursor-help">
                <CardHeader>
                  <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <CardTitle className="text-lg">MCA Compliant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Fully compliant with Maryland Cannabis Administration requirements
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

            <HoverCallout content="Upon successful completion of the course and final exam, you'll receive an official certificate valid through 2025 that meets all MCA requirements for Responsible Vendor Training.">
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
      <footer className="bg-foreground text-white py-8 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
            <div>
              <h4 className="text-lg font-semibold mb-4">ProCann Edu</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                Your friendly partner in cannabis education. Made with 💚 in Maryland.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-3">Quick Links</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/faq" className="text-gray-400 hover:text-white">FAQ</a></li>
                <li><a href="/verify-certificate" className="text-gray-400 hover:text-white">Verify Certificate</a></li>
                <li><a href="/auth" className="text-gray-400 hover:text-white">Sign In</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-3">For Organizations</h5>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-400">Bulk Training</span></li>
                <li><span className="text-gray-400">Compliance Reports</span></li>
                <li><span className="text-gray-400">Employee Management</span></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-3">Support</h5>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-400">info@procannedu.com</span></li>
                <li><span className="text-gray-400">Mon-Fri 9AM-6PM EST</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6 text-center">
            <p className="text-gray-400 mb-2">
              In accordance with the Maryland Cannabis Administration
            </p>
            <p className="text-sm text-gray-500">
              © 2024 ProCann Edu. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
