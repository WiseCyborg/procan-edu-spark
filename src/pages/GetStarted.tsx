import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, UserCog, GraduationCap, ArrowRight, Shield, FileText } from 'lucide-react';
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
            Choose your role to access the right training experience for you
          </p>
        </div>

        <COMARBanner />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {/* Dispensary Manager */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer group" onClick={() => navigate('/org/apply')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Dispensary</CardTitle>
              <CardDescription>Apply & manage your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Your Journey:</p>
                <ol className="space-y-2 ml-4 list-decimal">
                  <li>Submit application (10 min)</li>
                  <li>Pay for training seats</li>
                  <li>Register your account</li>
                  <li>Invite your team</li>
                  <li>Monitor compliance</li>
                </ol>
              </div>
              <Button className="w-full group-hover:bg-primary/90" onClick={() => navigate('/org/apply')}>
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Training Coordinator */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer group" onClick={() => navigate('/auth?role=training_coordinator')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-secondary/10 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <UserCog className="h-10 w-10 text-secondary" />
              </div>
              <CardTitle className="text-2xl">Coordinator</CardTitle>
              <CardDescription>Manage daily operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Your Journey:</p>
                <ol className="space-y-2 ml-4 list-decimal">
                  <li>Login with credentials</li>
                  <li>Invite employees</li>
                  <li>Monitor progress</li>
                  <li>Send reminders</li>
                  <li>Export reports</li>
                </ol>
              </div>
              <Button className="w-full" variant="outline" onClick={() => navigate('/auth?role=training_coordinator')}>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Employee/Student */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer group" onClick={() => navigate('/auth?role=student')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-accent/10 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <GraduationCap className="h-10 w-10 text-accent" />
              </div>
              <CardTitle className="text-2xl">Employee</CardTitle>
              <CardDescription>Get certified in 4-6 hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Your Journey:</p>
                <ol className="space-y-2 ml-4 list-decimal">
                  <li>Accept email invite</li>
                  <li>Complete profile (2 min)</li>
                  <li>Watch training videos</li>
                  <li>Pass exam (80% required)</li>
                  <li>Download certificate</li>
                </ol>
              </div>
              <Button className="w-full" variant="outline" onClick={() => navigate('/auth?role=student')}>
                Begin Training
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* MCA Inspector */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer group border-primary/50" onClick={() => navigate('/mca-compliance-review')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">MCA Official</CardTitle>
              <CardDescription>Compliance monitoring portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Portal Features:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Verify certificates</li>
                  <li>• View statewide metrics</li>
                  <li>• Export compliance reports</li>
                  <li>• Monitor activity feed</li>
                  <li>• Track by county</li>
                </ul>
              </div>
              <Button className="w-full" onClick={() => navigate('/mca-compliance-review')}>
                Access Portal
                <Shield className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Visual Flow Diagram */}
        <div className="mt-12">
          <Card className="max-w-5xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <FileText className="h-5 w-5" />
                How ProCann Edu Works
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
              <h3 className="text-lg font-semibold mb-2">Not sure which role to choose?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Dispensary Managers</strong> submit applications and purchase seats.{' '}
                <strong>Training Coordinators</strong> are assigned by managers to invite and monitor staff.{' '}
                <strong>Employees</strong> register using an invite or join code from their organization.
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
