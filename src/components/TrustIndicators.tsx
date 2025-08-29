import React, { useState, useEffect } from 'react';
import { Shield, Users, Award, CheckCircle, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CounterProps {
  end: number;
  duration?: number;
  suffix?: string;
}

const AnimatedCounter: React.FC<CounterProps> = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [end, duration]);

  return <span className="trust-counter">{count}{suffix}</span>;
};

export const TrustStats = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card className="p-4 text-center bg-white/10 backdrop-blur-sm border-white/20">
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter end={2500} suffix="+" />
        </div>
        <div className="text-sm text-white/80">Students Trained</div>
      </Card>
      
      <Card className="p-4 text-center bg-white/10 backdrop-blur-sm border-white/20">
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter end={150} suffix="+" />
        </div>
        <div className="text-sm text-white/80">Dispensaries</div>
      </Card>
      
      <Card className="p-4 text-center bg-white/10 backdrop-blur-sm border-white/20">
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter end={98} suffix="%" />
        </div>
        <div className="text-sm text-white/80">Pass Rate</div>
      </Card>
      
      <Card className="p-4 text-center bg-white/10 backdrop-blur-sm border-white/20">
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter end={4} suffix=".9" />
        </div>
        <div className="text-sm text-white/80">
          <div className="flex items-center justify-center gap-1">
            <Star className="h-3 w-3 fill-accent text-accent" />
            Rating
          </div>
        </div>
      </Card>
    </div>
  );
};

export const ComplianceBadges = () => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-6">
      <Badge 
        variant="secondary" 
        className="floating-badge bg-white/20 text-white border-white/30 px-4 py-2 text-sm backdrop-blur-sm"
      >
        <Shield className="h-4 w-4 mr-2" />
        MCA Approved
      </Badge>
      
      <Badge 
        variant="secondary" 
        className="floating-badge bg-white/20 text-white border-white/30 px-4 py-2 text-sm backdrop-blur-sm"
        style={{ animationDelay: '0.5s' }}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        COMAR Compliant
      </Badge>
      
      <Badge 
        variant="secondary" 
        className="floating-badge bg-white/20 text-white border-white/30 px-4 py-2 text-sm backdrop-blur-sm"
        style={{ animationDelay: '1s' }}
      >
        <Award className="h-4 w-4 mr-2" />
        Certified Training
      </Badge>
    </div>
  );
};

export const TestimonialCarousel = () => {
  const testimonials = [
    {
      quote: "ProCann Edu made compliance training straightforward and engaging for our entire team.",
      author: "Sarah M.",
      role: "Dispensary Manager",
      company: "GreenLeaf Wellness"
    },
    {
      quote: "The comprehensive curriculum and expert support helped us achieve 100% certification rate.",
      author: "Michael R.",
      role: "Operations Director", 
      company: "Capital Cannabis"
    },
    {
      quote: "Outstanding training platform with excellent customer service and quick certificate processing.",
      author: "Jennifer L.",
      role: "HR Manager",
      company: "Harvest Health"
    }
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <Card className="p-6 bg-white/10 backdrop-blur-sm border-white/20 max-w-lg mx-auto mb-8">
      <div className="text-center text-white">
        <div className="mb-4">
          <div className="flex justify-center mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-accent text-accent" />
            ))}
          </div>
          <p className="text-lg italic">"{testimonials[current].quote}"</p>
        </div>
        <div className="text-sm">
          <div className="font-semibold">{testimonials[current].author}</div>
          <div className="text-white/80">
            {testimonials[current].role} at {testimonials[current].company}
          </div>
        </div>
      </div>
    </Card>
  );
};