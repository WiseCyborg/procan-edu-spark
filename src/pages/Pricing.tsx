import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SUBSCRIPTION_TIERS, SPECIAL_PRICING, formatPrice } from '@/config/subscription-tiers';
import { Check, Users, ArrowRight, Building2, HelpCircle } from 'lucide-react';

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);
  const [showNonprofit, setShowNonprofit] = useState(false);

  const getPrice = (tier: typeof SUBSCRIPTION_TIERS[0]) => {
    let price = tier.annualPriceCents;
    if (showNonprofit) {
      price = price * (1 - SPECIAL_PRICING.nonprofit.discountPercent / 100);
    }
    return formatPrice(price);
  };

  const faqs = [
    {
      question: "What's the difference between active seats and rotational buffer?",
      answer: "Active seats are for employees currently in training. The rotational buffer allows you to archive completed employees and reassign their capacity to new hires without upgrading your tier. This provides flexibility for organizations with natural staff turnover."
    },
    {
      question: "Can I upgrade or downgrade my plan?",
      answer: "Yes! You can upgrade at any time and the pricing will be prorated for the remainder of your subscription period. Downgrades are processed at renewal and require you to reduce active users to fit the new tier limits."
    },
    {
      question: "What happens when an employee completes training?",
      answer: "When an employee completes training, they receive their certificate and their seat status changes to 'completed'. You can then archive them to free the seat for a new employee, or keep them active for annual recertification."
    },
    {
      question: "Do certificates remain valid if we downgrade?",
      answer: "Yes! All certificates issued remain valid regardless of your subscription status. Certificates have their own expiration dates based on Maryland regulations."
    },
    {
      question: "Is there a discount for nonprofits?",
      answer: `Yes! Nonprofit organizations with valid 501(c)(3) status receive ${SPECIAL_PRICING.nonprofit.discountPercent}% off all tier pricing. Toggle the nonprofit pricing option above to see discounted rates.`
    },
    {
      question: "What about multi-year commitments?",
      answer: `We offer ${SPECIAL_PRICING.multiYear2.discountPercent}% off for 2-year commitments and ${SPECIAL_PRICING.multiYear3.discountPercent}% off for 3-year commitments. Contact our sales team to set up a multi-year subscription.`
    }
  ];

  useEffect(() => {
    document.title = 'Pricing | ProCann Edu - Maryland Cannabis Training';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Enterprise training that scales with your organization. All plans include full access
              to the 24-module RVT curriculum and MCA-compliant certification.
            </p>

            {/* Toggles */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <Switch id="nonprofit" checked={showNonprofit} onCheckedChange={setShowNonprofit} />
                <Label htmlFor="nonprofit" className="cursor-pointer">
                  Nonprofit pricing ({SPECIAL_PRICING.nonprofit.discountPercent}% off)
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <Card 
                key={tier.id} 
                className={`relative ${tier.isPopular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {tier.isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {tier.displayName}
                    {tier.tierName === 'unlimited' && (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Up to {tier.maxActiveSeats === 999999 ? 'unlimited' : tier.maxActiveSeats} active learners
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-4xl font-bold">{getPrice(tier)}</span>
                    <span className="text-muted-foreground">/year</span>
                    {showNonprofit && (
                      <Badge variant="secondary" className="ml-2">
                        {SPECIAL_PRICING.nonprofit.discountPercent}% off
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {tier.maxActiveSeats < 999999 && (
                      <span>+{tier.rotationalBuffer} rotational buffer</span>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={tier.isPopular ? 'default' : 'outline'}
                    onClick={() => navigate('/dispensary-application')}
                  >
                    {tier.tierName === 'unlimited' ? 'Contact Sales' : 'Get Started'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Per-Seat Option */}
          <div className="mt-12 text-center">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Users className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">Need just a few seats?</p>
                    <p className="text-sm text-muted-foreground">
                      Individual seats available at $49.99/employee (Maryland max: $50.00)
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/dispensary-application')}>
                    Apply Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
              <HelpCircle className="h-6 w-6" />
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact CTA */}
          <div className="mt-16 text-center bg-muted/50 rounded-lg p-8">
            <h3 className="text-xl font-bold mb-2">Need a custom solution?</h3>
            <p className="text-muted-foreground mb-4">
              Contact our team for multi-location discounts, government pricing, or custom integrations.
            </p>
            <Button onClick={() => window.location.href = 'mailto:sales@procannedu.com'}>
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
  );
}
