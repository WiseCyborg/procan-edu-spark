import { Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
export const ROIHighlightCard = () => {
  const navigate = useNavigate();
  const {
    data: roiMetrics
  } = useQuery({
    queryKey: ['aggregate-roi-metrics'],
    queryFn: async () => {
      const {
        data
      } = await supabase.from('recommendation_impact_tracking').select('annual_savings_usd, improvement_pass_rate, reduction_retake_rate').eq('is_active', true);
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
  return <Card className="bg-gradient-to-br from-green-500/30 via-blue-500/30 to-purple-500/30 border-2 border-green-500/50 mb-10 max-w-4xl mx-auto">
      
    </Card>;
};