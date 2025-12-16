import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Shield, Clock, MapPin, ArrowRight, BookOpen, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const platformFeatures = [
  {
    icon: BookOpen,
    title: "24 Comprehensive Modules",
    description: "Complete COMAR-aligned curriculum covering all aspects of Maryland cannabis compliance"
  },
  {
    icon: Clock,
    title: "Self-Paced Learning",
    description: "Complete your certification in 4-6 hours at your own pace, with 24/7 access"
  },
  {
    icon: Shield,
    title: "COMAR-Aligned Content",
    description: "Curriculum designed to meet Maryland Cannabis Administration standards"
  },
  {
    icon: MapPin,
    title: "Serving All 24 Counties",
    description: "Training designed for Maryland dispensary employees statewide"
  },
  {
    icon: Award,
    title: "Verifiable Certificates",
    description: "Digital certificates with public verification portal for employers"
  },
  {
    icon: CheckCircle,
    title: "Under $50 Compliance",
    description: "Priced at $49.99 to comply with Maryland's maximum training cost requirements"
  }
];

export default function SuccessStories() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Maryland RVT Training Built for Success
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              ProCann Edu provides comprehensive, COMAR-aligned Responsible Vendor Training designed specifically for Maryland cannabis professionals
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/signup')}>
                Start Your Certification
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/faq')}>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Sets ProCann Edu Apart</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Designed by Maryland cannabis and education professionals for Maryland's unique regulatory environment
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {platformFeatures.map((feature, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Our Commitment Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Commitment to Maryland</h2>
            <p className="text-lg text-muted-foreground mb-8">
              ProCann Edu was built by Marylanders for Maryland. We understand the unique challenges and opportunities in our state's cannabis industry, and we're committed to training professionals who will uphold the highest standards of compliance and customer care.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold mb-2">Local Expertise</h3>
                <p className="text-sm text-muted-foreground">
                  Curriculum developed by Maryland cannabis and education professionals
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold mb-2">Regulatory Focus</h3>
                <p className="text-sm text-muted-foreground">
                  Content aligned with COMAR requirements and MCA standards
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg border">
                <h3 className="font-semibold mb-2">Accessible Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  $49.99 per student, compliant with Maryland's pricing requirements
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Certified?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join Maryland cannabis professionals who trust ProCann Edu for comprehensive, COMAR-aligned RVT certification training
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" onClick={() => navigate('/signup')}>
              Start Certification - $49.99
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10" onClick={() => navigate('/why-procann')}>
              See Full Details
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
