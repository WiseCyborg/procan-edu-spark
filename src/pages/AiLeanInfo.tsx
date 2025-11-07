import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Mic, Brain, Shield, Clock, MessageSquare, Users, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const AiLeanInfo = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mic,
      title: 'Voice-Activated Coaching',
      description: 'Just speak naturally - AiLean listens and responds with real-time guidance',
    },
    {
      icon: Brain,
      title: 'Context-Aware Intelligence',
      description: 'Understands your dispensary, team, and specific management challenges',
    },
    {
      icon: Shield,
      title: 'Secure & Confidential',
      description: 'Role-based access with enterprise-grade security for sensitive HR discussions',
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Get coaching support anytime, anywhere - perfect for busy managers on the go',
    },
    {
      icon: MessageSquare,
      title: 'Quick Scenarios',
      description: 'Pre-built coaching scenarios for common challenges: tardiness, performance, onboarding',
    },
    {
      icon: Users,
      title: 'Maryland-Specific',
      description: 'Tailored for Maryland cannabis dispensary operations and compliance',
    },
  ];

  const useCases = [
    'New employee onboarding guidance',
    'Performance issue coaching',
    'Attendance and tardiness management',
    'Conflict resolution strategies',
    'Compliance reminder coaching',
    'Team motivation techniques',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-4" variant="secondary">
            AI-Powered Management Coaching
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
            Meet AiLean
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            ✋ Talk to the Hand — Your AI Management Coach for Maryland Dispensaries
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
              Try AiLean Now
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/org/apply')} className="text-lg px-8">
              For Organizations
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-white dark:bg-background">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Managers Love AiLean
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <feature.icon className="w-10 h-10 text-primary mb-2" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Real Coaching Scenarios
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                {useCases.map((useCase, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{useCase}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-white dark:bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Access AiLean</h3>
                <p className="text-muted-foreground">
                  Open AiLean from your manager dashboard or use our mobile QR code activation
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Choose Your Scenario</h3>
                <p className="text-muted-foreground">
                  Select a pre-built coaching scenario or start a custom conversation
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Talk to the Hand</h3>
                <p className="text-muted-foreground">
                  Hold the voice button and speak naturally - AiLean listens and responds with actionable guidance
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Review & Reference</h3>
                <p className="text-muted-foreground">
                  All coaching sessions are saved so you can review guidance anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Management?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join Maryland dispensary managers who are getting instant coaching support with AiLean
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/contact')} className="text-lg px-8">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>AiLean is part of the ProCann Edu platform</p>
          <p className="mt-2">Serving Maryland dispensaries with AI-powered training and coaching</p>
        </div>
      </footer>
    </div>
  );
};

export default AiLeanInfo;
