import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, UserCog, GraduationCap, ArrowRight, Shield, FileText, Users, BookOpen, Award, Lock, Globe } from 'lucide-react';
import { COMARBanner } from '@/components/layout/COMARBanner';

const GetStarted = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Get Started with ProCann Edu
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your path to access the right training experience for you
          </p>
        </div>

        <COMARBanner />

        {/* Three Main Training Paths */}
        <div className="mt-8 mb-12">
          <h2 className="text-2xl font-bold text-center text-foreground mb-2">Training Paths</h2>
          <p className="text-center text-muted-foreground mb-6">Select the training track that matches your role</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Path 1: RVT Core (Employee) */}
            <Card className="hover:shadow-xl transition-shadow cursor-pointer group border-2 border-primary/20 relative overflow-hidden" onClick={() => navigate('/auth?role=student')}>
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                Required
              </div>
              <CardHeader className="text-center pt-8">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Award className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">RVT Core Training</CardTitle>
                <CardDescription>Maryland Employee Certification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="default" className="bg-primary">18 Modules</Badge>
                    <Badge variant="outline">4-6 Hours</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Complete Maryland RVT certification for dispensary employees. 
                    Meets all COMAR 14.17.05 requirements.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Requires join code from employer</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>Official RVT Certificate issued</span>
                  </div>
                </div>
                <Button className="w-full group-hover:bg-primary/90">
                  Begin RVT Training
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Path 2: Manager Track */}
            <Card className="hover:shadow-xl transition-shadow cursor-pointer group border-2 border-amber-500/20" onClick={() => navigate('/auth?role=training_coordinator')}>
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                Optional
              </div>
              <CardHeader className="text-center pt-8">
                <div className="mx-auto mb-4 p-4 bg-amber-500/10 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <Users className="h-10 w-10 text-amber-600" />
                </div>
                <CardTitle className="text-2xl">Manager Track</CardTitle>
                <CardDescription>Leadership Training Add-On</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="border-amber-500 text-amber-600">5 Modules</Badge>
                    <Badge variant="outline">2-3 Hours</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Advanced leadership training for dispensary managers and supervisors. 
                    Builds on RVT Core certification.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span>Requires RVT Core completion</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>Manager Certificate issued</span>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  Access Manager Track
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Path 3: Public Learning */}
            <Card className="hover:shadow-xl transition-shadow cursor-pointer group border-2 border-secondary/20" onClick={() => navigate('/learn')}>
              <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                Free
              </div>
              <CardHeader className="text-center pt-8">
                <div className="mx-auto mb-4 p-4 bg-secondary/10 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Globe className="h-10 w-10 text-secondary" />
                </div>
                <CardTitle className="text-2xl">Public Learning</CardTitle>
                <CardDescription>Free Cannabis Education</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">8-12 Modules</Badge>
                    <Badge variant="outline">Self-Paced</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Learn how Maryland dispensaries operate. Open to everyone — 
                    no account or join code required.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>No account required</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span>Completion badge (non-RVT)</span>
                  </div>
                </div>
                <Button className="w-full" variant="secondary">
                  Start Free Learning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted-foreground/20 max-w-4xl mx-auto">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Important:</strong> Only RVT Core Training provides official Maryland Responsible Vendor Training certification 
              as required by COMAR 14.17.05. Public Learning courses are for educational purposes only and do not satisfy 
              employee compliance requirements.
            </p>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Organization & Admin Access */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center text-foreground mb-2">Organization Access</h2>
          <p className="text-center text-muted-foreground mb-6">For dispensaries, coordinators, and compliance officials</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Dispensary Manager */}
            <Card className="hover:shadow-xl transition-shadow cursor-pointer group" onClick={() => navigate('/org/apply')}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Dispensary</CardTitle>
                <CardDescription className="text-xs">Apply & manage team</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="sm" onClick={() => navigate('/org/apply')}>
                  Apply Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Training Coordinator */}
            <Card className="hover:shadow-xl transition-shadow cursor-pointer group" onClick={() => navigate('/auth?role=training_coordinator')}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <UserCog className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-lg">Coordinator</CardTitle>
                <CardDescription className="text-xs">Manage daily operations</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" size="sm" onClick={() => navigate('/auth?role=training_coordinator')}>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Employee with Join Code */}
            <Card className="hover:shadow-xl transition-shadow cursor-pointer group" onClick={() => navigate('/auth?role=student')}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <GraduationCap className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-lg">Employee</CardTitle>
                <CardDescription className="text-xs">Have a join code?</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" size="sm" onClick={() => navigate('/auth?role=student')}>
                  Begin Training
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* MCA Inspector */}
            <Card className="hover:shadow-xl transition-shadow cursor-pointer group border-primary/50" onClick={() => navigate('/mca-compliance-review')}>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">MCA Official</CardTitle>
                <CardDescription className="text-xs">Compliance portal</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="sm" onClick={() => navigate('/mca-compliance-review')}>
                  Access Portal
                  <Shield className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Visual Flow Diagram */}
        <div className="mt-8">
          <Card className="max-w-5xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <FileText className="h-5 w-5" />
                How RVT Certification Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center flex-1">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold">Dispensary Applies</p>
                  <p className="text-xs text-muted-foreground">Submit application & pay</p>
                </div>
                <ArrowRight className="hidden md:block text-muted-foreground" />
                <div className="text-center flex-1">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-2">
                    <UserCog className="h-8 w-8 text-secondary" />
                  </div>
                  <p className="font-semibold">Manager Invites Team</p>
                  <p className="text-xs text-muted-foreground">Send email invitations</p>
                </div>
                <ArrowRight className="hidden md:block text-muted-foreground" />
                <div className="text-center flex-1">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                    <GraduationCap className="h-8 w-8 text-accent" />
                  </div>
                  <p className="font-semibold">Employees Train</p>
                  <p className="text-xs text-muted-foreground">Complete course & exam</p>
                </div>
                <ArrowRight className="hidden md:block text-muted-foreground" />
                <div className="text-center flex-1">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="font-semibold">MCA Verifies</p>
                  <p className="text-xs text-muted-foreground">Instant verification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center">
          <Card className="max-w-3xl mx-auto bg-muted/50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Not sure which path to choose?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Work at a dispensary?</strong> You need RVT Core Training — ask your manager for a join code.{' '}
                <strong>Dispensary owner?</strong> Apply to set up your organization.{' '}
                <strong>Just curious?</strong> Start with our free Public Learning courses.
              </p>
              <Button variant="link" onClick={() => navigate('/faq')}>
                View FAQ for more information
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact us at{' '}
            <a href="mailto:info@procannedu.com" className="underline hover:text-primary">
              info@procannedu.com
            </a>
            {' '}or check our{' '}
            <button onClick={() => navigate('/faq')} className="underline hover:text-primary">
              FAQ page
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
