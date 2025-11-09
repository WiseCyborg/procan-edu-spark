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

      // Calculate daily trends
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const dailyData = last7Days.map(date => {
        const dayLogs = data?.filter(log => 
          log.created_at?.startsWith(date)
        ) || [];
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sent: dayLogs.filter(l => l.status === 'sent').length,
          opened: dayLogs.filter(l => l.opened_at).length,
          clicked: dayLogs.filter(l => l.clicked_at).length,
        };
      });

      return {
        total,
        sent,
        opened,
        clicked,
        failed,
        deliveryRate: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
        openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0,
        clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0,
        dailyData,
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Email Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics?.dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sent" stroke="hsl(var(--primary))" name="Sent" />
            <Line type="monotone" dataKey="opened" stroke="hsl(var(--chart-2))" name="Opened" />
            <Line type="monotone" dataKey="clicked" stroke="hsl(var(--chart-3))" name="Clicked" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};