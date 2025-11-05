import { Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const ROIHighlightCard = () => {
  const navigate = useNavigate();

  const { data: roiMetrics } = useQuery({
    queryKey: ['aggregate-roi-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('recommendation_impact_tracking')
        .select('annual_savings_usd, improvement_pass_rate, reduction_retake_rate')
        .eq('is_active', true);
      
      if (!data || data.length === 0) {
        return {
          avgSavings: 12000,
          avgPassRateImprovement: 18,
          avgRetakeReduction: 45
        };
      }

      return {
        avgSavings: Math.round(data.reduce((sum, r) => sum + (r.annual_savings_usd || 0), 0) / data.length),
        avgPassRateImprovement: Math.round(data.reduce((sum, r) => sum + (r.improvement_pass_rate || 0), 0) / data.length),
        avgRetakeReduction: Math.round(data.reduce((sum, r) => sum + (r.reduction_retake_rate || 0), 0) / data.length)
      };
    }
  });

  return (
    <Card className="bg-gradient-to-br from-green-500/30 via-blue-500/30 to-purple-500/30 border-2 border-green-500/50 mb-10 max-w-4xl mx-auto">
      <CardContent className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <Brain className="h-12 w-12 text-green-400" />
          <div>
            <h3 className="text-2xl font-bold text-white">AI-Powered ROI Tracking</h3>
            <p className="text-white/80">
              The only RVT platform that PROVES your training investment pays off
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-4">
            <div className="text-4xl font-bold text-green-400 mb-2">
              ${(roiMetrics?.avgSavings || 12000).toLocaleString()}+
            </div>
            <div className="text-sm text-white/80">Avg Annual Savings Per Dispensary</div>
          </div>
          <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-4">
            <div className="text-4xl font-bold text-blue-400 mb-2">
              {roiMetrics?.avgPassRateImprovement || 18}%
            </div>
            <div className="text-sm text-white/80">Avg Pass Rate Improvement</div>
          </div>
          <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-4">
            <div className="text-4xl font-bold text-purple-400 mb-2">
              {roiMetrics?.avgRetakeReduction || 45}%
            </div>
            <div className="text-sm text-white/80">Reduction in Retake Costs</div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button 
            variant="outline" 
            className="border-white/40 text-white hover:bg-white/10"
            onClick={() => navigate('/org/apply')}
          >
            Calculate Your Dispensary's ROI →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
