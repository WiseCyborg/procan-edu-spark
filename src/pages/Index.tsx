
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Shield, CheckCircle } from 'lucide-react';
import { CoursePreviewSystem } from '@/components/EnhancedCoursePreview';
import { AccessibilityToolbar } from '@/components/MobileOptimization';
import { TrustStats, ComplianceBadges, TestimonialCarousel } from '@/components/TrustIndicators';
import { EnhancedPlayControls } from '@/components/ui/enhanced-play-controls';
import { HoverCallout } from '@/components/ui/hover-callout';

const Index = () => {
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  return (
    <div className="min-h-screen">
      <AccessibilityToolbar />
      {/* Enhanced Hero Section with Video Background */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video
          ref={videoRef}
          className="video-background"
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1920&q=80"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-cannabis-plants-in-a-greenhouse-44885-large.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Video Overlay */}
        <div className="absolute inset-0 video-overlay"></div>

        {/* Enhanced Video Controls */}
        <div className="absolute top-6 right-6 z-20">
          <EnhancedPlayControls
            isPlaying={isVideoPlaying}
            onTogglePlay={toggleVideo}
            size="lg"
            className="bg-background/20 backdrop-blur-sm rounded-lg p-2"
          />
        </div>

        <div className="relative z-10 container mx-auto text-center px-4">
          {/* Compliance Badges */}
          <ComplianceBadges />

          {/* Heartbeat Logo Animation */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-stoplight-green via-stoplight-yellow to-stoplight-red opacity-30 blur-3xl animate-heartbeat"></div>
            <h1 className="relative text-6xl md:text-7xl font-bold text-white mb-4 leading-tight font-poppins">
              ProCann Edu
            </h1>
          </div>

          <h2 className="text-2xl md:text-3xl text-white/90 mb-6 font-medium font-poppins">
            The Heartbeat of Responsible Cannabis Education in Maryland
          </h2>

          {/* New Tagline Section */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-8 max-w-3xl mx-auto">
            <p className="text-xl text-white/95 font-inter leading-relaxed">
              We don't just teach compliance.
              <br />
              We teach <strong>confidence</strong>, <strong>community</strong>, and <strong>care</strong>.
            </p>
          </div>

          {/* Trust Statistics */}
          <TrustStats />

          {/* Testimonial */}
          <TestimonialCarousel />
          {/* Enhanced Value Proposition */}
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed">
            Join 2,500+ cannabis professionals who trust ProCann Edu for MCA-compliant training. 
            <br className="hidden md:block" />
            Complete your Responsible Vendor Training (RVT) and earn your official certificate.
          </p>

          {/* Urgency Banner */}
          <div className="bg-accent/90 backdrop-blur-sm border border-accent rounded-lg p-4 mb-8 max-w-2xl mx-auto">
            <p className="text-accent-foreground font-semibold">
              🚨 Compliance Deadline Approaching
            </p>
            <p className="text-accent-foreground/80 text-sm mt-1">
              Ensure your team meets Maryland's training requirements
            </p>
          </div>
          
          {/* Enhanced CTA Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
            <Button 
              onClick={() => navigate('/auth?role=dispensary')}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 h-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <BookOpen className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div>Dispensary Portal</div>
                <div className="text-sm font-normal opacity-90">Setup training programs</div>
              </div>
            </Button>

            <Button 
              onClick={() => navigate('/auth?role=student')}
              variant="outline"
              size="lg"
              className="border-2 border-white/40 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm px-8 py-4 h-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <Award className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div>Employee Login</div>
                <div className="text-sm font-normal opacity-90">Start your training</div>
              </div>
            </Button>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 text-white/80">
            <button 
              onClick={() => navigate('/faq')}
              className="hover:text-white transition-colors underline"
            >
              FAQ
            </button>
            <span>•</span>
            <button 
              onClick={() => navigate('/verify-certificate')}
              className="hover:text-white transition-colors underline"
            >
              Verify Certificate
            </button>
            <span>•</span>
            <a 
              href="mailto:info@procannedu.com"
              className="hover:text-white transition-colors underline"
            >
              Contact Support
            </a>
          </div>
        </div>
      </section>

      {/* Maryland First Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-stoplight-green/10 to-stoplight-cream">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold text-stoplight-charcoal mb-6 font-poppins">
            Built in Maryland, for Maryland
          </h3>
          <div className="max-w-4xl mx-auto mb-8">
            <p className="text-lg text-gray-700 mb-6 font-inter">
              Designed by local educators, cannabis professionals, and community advocates who understand the culture and values of our state.
            </p>
            
            {/* Maryland Imagery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <img 
                src="https://images.unsplash.com/photo-1606081541033-e06b96dd8e86?w=400" 
                alt="Baltimore Inner Harbor" 
                className="rounded-lg shadow-md h-32 w-full object-cover"
              />
              <img 
                src="https://images.unsplash.com/photo-1599644898299-27b0f7e5cfc6?w=400" 
                alt="Maryland State House" 
                className="rounded-lg shadow-md h-32 w-full object-cover"
              />
              <img 
                src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400" 
                alt="Community gathering" 
                className="rounded-lg shadow-md h-32 w-full object-cover"
              />
              <img 
                src="https://images.unsplash.com/photo-1587408777892-52db0a9a1e2d?w=400" 
                alt="Maryland landscape" 
                className="rounded-lg shadow-md h-32 w-full object-cover"
              />
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
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Why Choose ProCann Edu?
          </h3>
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
      <section className="py-16 px-4 bg-green-600">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Get Certified?
          </h3>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of cannabis professionals who trust ProCann Edu
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            size="lg"
            className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3"
          >
            Start Your Training Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
            <div>
              <h4 className="text-lg font-semibold mb-4">ProCann Edu</h4>
              <p className="text-gray-400 text-sm">
                Maryland's premier cannabis education platform, providing MCA-compliant training and certification.
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
