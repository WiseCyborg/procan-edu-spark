import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Mail, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export const EmailAnalyticsDashboard = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['email-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Calculate metrics
      const total = data?.length || 0;
      const sent = data?.filter(e => e.status === 'sent').length || 0;
      const opened = data?.filter(e => e.opened_at).length || 0;
      const clicked = data?.filter(e => e.clicked_at).length || 0;
      const failed = data?.filter(e => e.status === 'failed').length || 0;

      return {
        total,
        sent,
        opened,
        clicked,
        failed,
        deliveryRate: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
        openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0,
        clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0,
      };
    },
  });

  if (isLoading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Delivery Rate</p>
              <p className="text-3xl font-bold text-primary">{analytics?.deliveryRate}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open Rate</p>
              <p className="text-3xl font-bold text-primary">{analytics?.openRate}%</p>
            </div>
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Click Rate</p>
              <p className="text-3xl font-bold text-primary">{analytics?.clickRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-3xl font-bold text-destructive">{analytics?.failed}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </Card>
      </div>
    </div>
  );
};