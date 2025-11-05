import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Brain, Shield, Zap, TrendingUp, MapPin, DollarSign, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CompetitorComparison() {
  const navigate = useNavigate();

  const features = [
    { feature: "Built for Maryland", procann: true, competitorA: false, competitorB: false },
    { feature: "AI-Powered ROI Tracking", procann: true, competitorA: false, competitorB: false },
    { feature: "COMAR Auto-Updates", procann: "Live", competitorA: "Manual", competitorB: "Quarterly" },
    { feature: "Predictive Analytics", procann: true, competitorA: false, competitorB: false },
    { feature: "Price Per Student", procann: "$49.99", competitorA: "$125", competitorB: "$99" },
    { feature: "Average Pass Rate", procann: "87%", competitorA: "78%", competitorB: "81%" },
    { feature: "Annual ROI Proven", procann: "$12K+", competitorA: "Unknown", competitorB: "Unknown" },
    { feature: "24/7 AI Support", procann: true, competitorA: false, competitorB: "Limited" },
    { feature: "Mobile Optimized", procann: true, competitorA: true, competitorB: true },
    { feature: "Spanish Support", procann: true, competitorA: false, competitorB: true },
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
            Comparison Guide
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">
            Why ProCann Edu Wins for Maryland Dispensaries
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're not just another RVT provider. Here's the proof.
          </p>
        </div>

        {/* Comparison Table */}
        <Card className="mb-12 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Feature</TableHead>
                  <TableHead className="text-center bg-primary/5">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="h-6 w-6 text-primary" />
                      <span className="font-bold text-primary">ProCann Edu</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Competitor A</TableHead>
                  <TableHead className="text-center">Competitor B</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.feature}</TableCell>
                    <TableCell className="text-center bg-primary/5">
                      {renderCell(row.procann)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderCell(row.competitorA)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderCell(row.competitorB)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Unique Features Spotlight */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow border-2 border-primary/20">
            <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">AI-Powered ROI</h3>
            <p className="text-muted-foreground">
              Only platform that PROVES your training investment with predictive analytics
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow border-2 border-green-600/20">
            <MapPin className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Maryland DNA</h3>
            <p className="text-muted-foreground">
              Built by Marylanders, for Maryland dispensaries. COMAR-embedded curriculum.
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow border-2 border-blue-600/20">
            <TrendingUp className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Proven Results</h3>
            <p className="text-muted-foreground">
              87% pass rate, $12K+ annual savings, 45% reduction in retake costs
            </p>
          </Card>
        </div>

        {/* Why Maryland Matters */}
        <Card className="mb-12 bg-gradient-to-br from-primary/5 to-green-500/5 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Shield className="h-12 w-12 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl font-bold mb-4">Why "Maryland-Built" Matters</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Live COMAR updates:</strong> Our curriculum auto-syncs with Maryland Cannabis Administration regulations</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Local compliance expertise:</strong> We understand Maryland-specific challenges (county variations, MCA audit patterns)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Zap className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Pricing transparency:</strong> $49.99 per employee (state max: $50.00) - no hidden fees</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary to-green-600 rounded-2xl p-8 text-white">
          <h3 className="text-3xl font-bold mb-4">
            Ready to See the Difference?
          </h3>
          <p className="text-xl mb-6 text-white/90">
            Get your free compliance audit and ROI projection
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/org/apply')}
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Get Free Audit
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
