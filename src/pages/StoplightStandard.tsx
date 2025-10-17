import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, AlertTriangle, AlertCircle } from 'lucide-react';

const StoplightStandard = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      color: 'green',
      icon: Shield,
      title: 'Green Zone (10mg)',
      subtitle: 'Responsible Baseline',
      description: 'The foundation of responsible cannabis consumption. Ideal for new users and daily wellness.',
      keyPoints: [
        'Recommended starting dose for most adults',
        'Lowest risk profile',
        'Best for maintaining daily function',
        'Promotes responsible vendor practices'
      ],
      bgColor: 'bg-stoplight-green/10',
      borderColor: 'border-stoplight-green',
      textColor: 'text-stoplight-green'
    },
    {
      color: 'yellow',
      icon: AlertTriangle,
      title: 'Yellow Zone (25mg)',
      subtitle: 'Moderate Caution',
      description: 'For experienced users who understand their tolerance. Requires vendor awareness and customer education.',
      keyPoints: [
        'Requires confirmed tolerance understanding',
        'Increased vendor responsibility',
        'Enhanced customer education needed',
        'Careful dosing guidance essential'
      ],
      bgColor: 'bg-stoplight-yellow/10',
      borderColor: 'border-stoplight-yellow',
      textColor: 'text-stoplight-yellow'
    },
    {
      color: 'red',
      icon: AlertCircle,
      title: 'Red Zone (50mg)',
      subtitle: 'High-Dose Awareness',
      description: 'Advanced products requiring extensive vendor training and comprehensive customer consultation.',
      keyPoints: [
        'Only for highly experienced users',
        'Mandatory consultation required',
        'Maximum vendor vigilance',
        'Comprehensive safety protocols'
      ],
      bgColor: 'bg-stoplight-red/10',
      borderColor: 'border-stoplight-red',
      textColor: 'text-stoplight-red'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stoplight-cream to-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-stoplight-charcoal mb-6 font-poppins">
            The Stoplight Standard™
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-8 font-inter">
            A revolutionary approach to responsible cannabis dosage education, 
            designed to protect consumers and empower vendors with clear, 
            actionable guidance.
          </p>
          
          {/* Visual Stoplight */}
          <div className="flex justify-center items-center gap-6 my-12">
            <div className="w-24 h-24 rounded-full bg-stoplight-red border-4 border-stoplight-red/30 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">50mg</span>
            </div>
            <div className="w-24 h-24 rounded-full bg-stoplight-yellow border-4 border-stoplight-yellow/30 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">25mg</span>
            </div>
            <div className="w-24 h-24 rounded-full bg-stoplight-green border-4 border-stoplight-green/30 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">10mg</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tier Details */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((tier, index) => (
              <Card key={index} className={`${tier.bgColor} border-2 ${tier.borderColor}`}>
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-2">
                    <tier.icon className={`w-8 h-8 ${tier.textColor}`} />
                    <CardTitle className={`text-2xl ${tier.textColor} font-poppins`}>
                      {tier.title}
                    </CardTitle>
                  </div>
                  <p className="text-sm font-semibold text-gray-600">{tier.subtitle}</p>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-700 font-inter">{tier.description}</p>
                  <ul className="space-y-2">
                    {tier.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <ArrowRight className={`w-4 h-4 mt-0.5 ${tier.textColor} flex-shrink-0`} />
                        <span className="text-sm text-gray-600">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Teach This */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-stoplight-charcoal mb-6 font-poppins">
            How We Teach This Throughout Every Course
          </h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8 font-inter">
            The Stoplight Standard™ isn't just theory — it's woven into every module of our 18-part training program. 
            From legal compliance to customer service, you'll learn to apply these principles in real-world scenarios.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth?role=student')}
            className="bg-stoplight-green hover:bg-stoplight-green/90 text-white font-poppins"
          >
            Start Your Training Journey
          </Button>
        </div>
      </section>
    </div>
  );
};

export default StoplightStandard;