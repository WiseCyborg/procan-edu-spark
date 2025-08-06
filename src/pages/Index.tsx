
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, Shield, CheckCircle } from 'lucide-react';
import { CoursePreviewSystem } from '@/components/EnhancedCoursePreview';
import { AccessibilityToolbar, MobileOptimizationIndicator } from '@/components/MobileOptimization';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <AccessibilityToolbar />
      <MobileOptimizationIndicator />
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto text-center">
          {/* Dispensary Setup Required Banner */}
          <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 mb-8 max-w-4xl mx-auto">
            <p className="text-amber-800 font-semibold text-lg">
              🏢 Dispensary Setup Required First
            </p>
            <p className="text-amber-700 text-sm mt-1">
              Individual student access requires dispensary sponsorship
            </p>
          </div>

          <h1 className="text-5xl font-bold text-green-700 mb-6">
            ProCann Edu
          </h1>
          <h2 className="text-2xl text-gray-700 mb-4">
            Maryland Cannabis Training Platform
          </h2>
          
          {/* Process Flow Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">How ProCann Edu Works</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-blue-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <span className="font-medium text-lg">Dispensary purchases training</span>
              </div>
              <div className="hidden md:block text-blue-400 text-2xl">→</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <span className="font-medium text-lg">Employees complete courses</span>
              </div>
            </div>
          </div>

          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get certified with Maryland's premier cannabis education platform. 
            Complete your Responsible Vendor Training (RVT) and earn your official certificate.
          </p>
          
          {/* Role-Based Entry Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
            <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
              <CardContent className="p-8 text-center">
                <BookOpen className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="font-bold text-green-700 mb-3 text-xl">Dispensary Portal</h3>
                <p className="text-gray-600 mb-6">Setup & manage employee training programs</p>
                <Button 
                  onClick={() => navigate('/auth?role=dispensary')}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                  size="lg"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
              <CardContent className="p-8 text-center">
                <Award className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold text-blue-700 mb-3 text-xl">Employee Login</h3>
                <p className="text-gray-600 mb-6">Access training with dispensary key</p>
                <Button 
                  onClick={() => navigate('/auth?role=student')}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50 px-8 py-3"
                  size="lg"
                >
                  Start Training
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => navigate('/faq')}
              size="lg"
              variant="ghost"
              className="px-8 py-3"
            >
              FAQ
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Why Choose ProCann Edu?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
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

            <Card className="text-center">
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

            <Card className="text-center">
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

            <Card className="text-center">
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
