import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Brain, Shield, Zap, TrendingUp, MapPin, DollarSign, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CompetitorComparison() {
  const navigate = useNavigate();

  const features = [
    { feature: "Maryland-Specific Content", proCannEdu: "Tailored to MD", industryStandard: "Multi-state generic" },
    { feature: "AI-Powered ROI Tracking", proCannEdu: "Real-time", industryStandard: "Manual reporting" },
    { feature: "COMAR Regulatory Updates", proCannEdu: "Live & automatic", industryStandard: "Quarterly updates" },
    { feature: "AI Compliance Assistant", proCannEdu: "24/7 access", industryStandard: "Email support" },
    { feature: "Analytics Dashboard", proCannEdu: "Real-time", industryStandard: "Basic reporting" },
    { feature: "Compliance Risk Scoring", proCannEdu: "Predictive AI", industryStandard: "Not available" },
    { feature: "Mobile Learning", proCannEdu: "Fully optimized", industryStandard: "Limited" },
    { feature: "Certificate Verification", proCannEdu: "Secure QR system", industryStandard: "PDF format" },
    { feature: "Exam Preparation", proCannEdu: "AI-powered study tools", industryStandard: "Self-study materials" },
    { feature: "Average Completion Time", proCannEdu: "4-6 hours", industryStandard: "6-12 hours" },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-600 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-red-400 mx-auto" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/10 py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Feature Overview
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">
            What Makes ProCann Edu Unique for Maryland
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Specialized features designed specifically for Maryland dispensaries and cannabis professionals
          </p>
        </div>

        {/* Comparison Table */}
        <Card className="mb-12 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">What Makes ProCann Edu Unique</CardTitle>
            <p className="text-center text-muted-foreground mt-2">
              Objective comparison of Maryland-specific features (as of January 2025)
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Feature</TableHead>
                  <TableHead className="font-bold text-primary">ProCann Edu</TableHead>
                  <TableHead className="font-bold">Industry Standard</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((feature, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{feature.feature}</TableCell>
                    <TableCell>{renderCell(feature.proCannEdu)}</TableCell>
                    <TableCell>{renderCell(feature.industryStandard)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Data verified through public information and platform features as of January 2025
            </p>
          </CardContent>
        </Card>

        {/* Maryland-Specific Capabilities */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">
            Maryland-Specific Capabilities
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-primary/20">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-primary">Live COMAR Alignment</h3>
              <p className="text-muted-foreground">
                Automatic curriculum updates when Maryland regulations change. Always aligned to the latest 
                COMAR 14.17.05 standards without manual content revisions.
              </p>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-primary/20">
              <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-primary">Real-Time ROI Analytics</h3>
              <p className="text-muted-foreground">
                AI-powered tracking of compliance savings through reduced retakes, faster training completion, 
                and efficiency improvements—with transparent methodology available for review.
              </p>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow border-primary/20">
              <MapPin className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-primary">Maryland-First Design</h3>
              <p className="text-muted-foreground">
                Content developed exclusively for Maryland's regulatory environment. Every scenario and 
                example reflects actual Maryland dispensary operations and compliance requirements.
              </p>
            </Card>
          </div>
        </div>

        {/* Why Maryland-Specific Matters */}
        <Card className="mb-12 bg-gradient-to-br from-primary/5 to-accent/10 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Shield className="h-12 w-12 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Why Maryland-Specific Training Matters</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Real-time regulatory alignment:</strong> Curriculum automatically syncs with Maryland Cannabis Administration updates to COMAR 14.17.05</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Local compliance expertise:</strong> Content developed by Maryland cannabis professionals familiar with county-specific requirements and MCA audit patterns</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Regulatory pricing compliance:</strong> $49.99 per employee (Maryland maximum: $50.00) with transparent pricing and no hidden fees</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>Comprehensive preparation:</strong> AI-powered study tools and practice exams designed to support first-attempt success</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary to-accent rounded-2xl p-8 text-white">
          <h3 className="text-3xl font-bold mb-4">
            Experience Maryland-Specific RVT Training
          </h3>
          <p className="text-xl mb-6 text-white/90">
            See how ProCann Edu's unique features support your compliance goals
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/org/apply')}
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Request Information
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/roi-calculator-public')}
              className="bg-white/10 border-2 border-white text-white hover:bg-white/20"
            >
              Calculate Your ROI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
