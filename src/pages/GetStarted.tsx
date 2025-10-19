import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, UserCog, GraduationCap, ArrowRight } from 'lucide-react';
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Dispensary Manager */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer group" onClick={() => navigate('/org/apply')}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Dispensary Manager</CardTitle>
              <CardDescription>Represent your licensed dispensary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">What you can do:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Submit dispensary application</li>
                  <li>• Purchase training seats for your team</li>
                  <li>• Assign Training Coordinators</li>
                  <li>• View compliance reports</li>
                  <li>• Manage organization settings</li>
                </ul>
              </div>
              <Button className="w-full group-hover:bg-primary/90" onClick={() => navigate('/org/apply')}>
                Apply as Dispensary
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
              <CardTitle className="text-2xl">Training Coordinator</CardTitle>
              <CardDescription>Manage day-to-day training operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">What you can do:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Invite and assign employees</li>
                  <li>• Manage seat allocation</li>
                  <li>• Monitor employee progress</li>
                  <li>• Send reminders and updates</li>
                  <li>• Export compliance reports</li>
                </ul>
              </div>
              <Button className="w-full" variant="outline" onClick={() => navigate('/auth?role=training_coordinator')}>
                Sign In as Coordinator
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
              <CardTitle className="text-2xl">Employee / Student</CardTitle>
              <CardDescription>Complete your RVT certification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">What you can do:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Register with email invite or join code</li>
                  <li>• Complete 18 training modules</li>
                  <li>• Take quizzes and final exam</li>
                  <li>• Earn your RVT certificate</li>
                  <li>• Track your progress</li>
                </ul>
              </div>
              <Button className="w-full" variant="outline" onClick={() => navigate('/auth?role=student')}>
                Begin Training
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
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
