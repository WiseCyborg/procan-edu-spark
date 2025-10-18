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
        <div className="text-sm text-white/80">Agents Capacity</div>
      </Card>
      
      <Card className="p-4 text-center bg-white/10 backdrop-blur-sm border-white/20">
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter end={150} suffix="+" />
        </div>
        <div className="text-sm text-white/80">Dispensary Reach</div>
      </Card>
      
      <Card className="p-4 text-center bg-white/10 backdrop-blur-sm border-white/20">
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter end={18} suffix="" />
        </div>
        <div className="text-sm text-white/80">Training Modules</div>
      </Card>
      
      <Card className="p-4 text-center bg-white/10 backdrop-blur-sm border-white/20">
        <div className="text-2xl font-bold text-white">
          100%
        </div>
        <div className="text-sm text-white/80">MD Educators</div>
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
      quote: "We built ProCann Edu because Maryland deserves cannabis training that reflects our values: community, care, and compliance done right.",
      author: "ProCann Edu Team",
      role: "Founders",
      company: "Built in Maryland"
    },
    {
      quote: "Our curriculum was designed by local educators and cannabis professionals who understand Maryland's unique regulatory landscape.",
      author: "Curriculum Team",
      role: "Education Specialists", 
      company: "ProCann Edu"
    },
    {
      quote: "We're committed to training the next generation of responsible cannabis professionals right here in Maryland.",
      author: "ProCann Edu",
      role: "Mission Statement",
      company: "Serving Maryland"
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