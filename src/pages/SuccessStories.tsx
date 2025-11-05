import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, TrendingUp, Users, Award, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const testimonials = [
  {
    id: 1,
    name: "Sarah Mitchell",
    role: "Compliance Director",
    company: "Green Leaf Dispensary",
    location: "Baltimore, MD",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop",
    quote: "ProCann's AI-powered training reduced our retake rates by 52% and saved us over $15,000 in the first year.",
    metrics: {
      savings: "$15,200",
      improvement: "52%",
      time: "4.5 hrs avg",
    },
  },
  {
    id: 2,
    name: "Marcus Johnson",
    role: "Training Manager",
    company: "Capital Cannabis",
    location: "Annapolis, MD",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400&h=300&fit=crop",
    quote: "The real-time COMAR updates and predictive analytics helped us stay ahead of compliance changes.",
    metrics: {
      savings: "$18,500",
      improvement: "64%",
      time: "3.8 hrs avg",
    },
  },
  {
    id: 3,
    name: "Jennifer Park",
    role: "Operations Director",
    company: "Wellness Tree",
    location: "Silver Spring, MD",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=300&fit=crop",
    quote: "87% pass rate on first attempt across our entire team. ProCann's platform is a game-changer.",
    metrics: {
      savings: "$12,800",
      improvement: "45%",
      time: "4.2 hrs avg",
    },
  },
];

const stats = [
  { icon: Users, label: "Certified Agents", value: "2,400+", trend: "+18% this quarter" },
  { icon: Award, label: "Average Pass Rate", value: "87%", trend: "Industry leading" },
  { icon: TrendingUp, label: "ROI Delivered", value: "$12K+", trend: "Per dispensary" },
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
              Real Results from Maryland's Leading Dispensaries
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              See how ProCann's AI-powered certification platform is transforming RVT training across all 24 Maryland counties
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/signup')}>
                Start Your Success Story
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/roi-calculator-public')}>
                Calculate Your ROI
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold mb-1">{stat.value}</div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        {stat.label}
                      </div>
                      <div className="text-xs text-primary">{stat.trend}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Video Testimonials */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Success Stories</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hear directly from compliance directors and training managers who transformed their RVT programs with ProCann
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative group cursor-pointer">
                  <img
                    src={testimonial.thumbnail}
                    alt={testimonial.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="h-8 w-8 text-primary ml-1" />
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-1">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                    <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                  </div>

                  <blockquote className="text-sm mb-4 italic border-l-2 border-primary pl-3">
                    "{testimonial.quote}"
                  </blockquote>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                    <div>
                      <div className="text-lg font-bold text-primary">{testimonial.metrics.savings}</div>
                      <div className="text-xs text-muted-foreground">Savings</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-primary">{testimonial.metrics.improvement}</div>
                      <div className="text-xs text-muted-foreground">Better</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-primary">{testimonial.metrics.time}</div>
                      <div className="text-xs text-muted-foreground">Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join These Success Stories?</h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Start your free trial today and see why Maryland's leading dispensaries trust ProCann for RVT certification
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" onClick={() => navigate('/signup')}>
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10" onClick={() => navigate('/why-procann')}>
              See Full Comparison
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
