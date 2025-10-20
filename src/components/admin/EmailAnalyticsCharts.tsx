import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  sent?: number;
  failed?: number;
  opened?: number;
}

export const EmailAnalyticsCharts = () => {
  const [deliveryTrend, setDeliveryTrend] = useState<ChartData[]>([]);
  const [volumeData, setVolumeData] = useState<ChartData[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<ChartData[]>([]);
  const [deliverabilityScore, setDeliverabilityScore] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch email logs for analytics
      const { data: logs } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      const { data: commLogs } = await supabase
        .from('communication_logs')
        .select('*')
        .limit(1000);

      if (logs) {
        // Calculate delivery trend (last 7 days)
        const trendData: ChartData[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayLogs = logs.filter(l => 
            new Date(l.created_at).toDateString() === date.toDateString()
          );
          
          const sent = dayLogs.filter(l => l.status === 'sent').length;
          const failed = dayLogs.filter(l => l.status === 'failed').length;
          const total = sent + failed;
          
          trendData.push({
            name: date.toLocaleDateString('en-US', { weekday: 'short' }),
            value: total > 0 ? (sent / total) * 100 : 0,
            sent,
            failed,
          });
        }
        setDeliveryTrend(trendData);

        // Email volume by hour
        const volumeByHour: { [key: number]: { sent: number; failed: number } } = {};
        logs.forEach(log => {
          const hour = new Date(log.created_at).getHours();
          if (!volumeByHour[hour]) {
            volumeByHour[hour] = { sent: 0, failed: 0 };
          }
          if (log.status === 'sent') {
            volumeByHour[hour].sent++;
          } else if (log.status === 'failed') {
            volumeByHour[hour].failed++;
          }
        });

        const volumeChartData = Object.entries(volumeByHour).map(([hour, counts]) => ({
          name: `${hour}:00`,
          sent: counts.sent,
          failed: counts.failed,
          value: counts.sent + counts.failed,
        }));
        setVolumeData(volumeChartData);

        // Email type distribution
        const typeCount: { [key: string]: number } = {};
        logs.forEach(log => {
          typeCount[log.email_type] = (typeCount[log.email_type] || 0) + 1;
        });

        const typeChartData = Object.entries(typeCount).map(([type, count]) => ({
          name: type,
          value: count,
        }));
        setTypeDistribution(typeChartData);

        // Calculate deliverability score
        const totalSent = logs.filter(l => l.status === 'sent').length;
        const totalFailed = logs.filter(l => l.status === 'failed').length;
        const totalOpened = commLogs?.filter(c => c.opened_at).length || 0;
        const totalClicked = commLogs?.filter(c => c.clicked_at).length || 0;

        const deliveryRate = totalSent / (totalSent + totalFailed) || 0;
        const openRate = totalOpened / totalSent || 0;
        const clickRate = totalClicked / totalSent || 0;

        const score = Math.round(
          (deliveryRate * 35) + 
          (openRate * 30) + 
          (clickRate * 20) + 
          15 // Base score for active monitoring
        );

        setDeliverabilityScore(score);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Deliverability Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall Email Health Score
          </CardTitle>
          <CardDescription>Composite score based on delivery, open, and click rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">
                {deliverabilityScore}
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                {deliverabilityScore >= 90 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-semibold">Excellent</span>
                  </>
                ) : deliverabilityScore >= 70 ? (
                  <>
                    <Activity className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-600 font-semibold">Good</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <span className="text-red-600 font-semibold">Needs Improvement</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Rate Trend (7 Days)</CardTitle>
          <CardDescription>Success rate percentage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={deliveryTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="Success Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Email Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Email Volume by Hour</CardTitle>
          <CardDescription>Sent vs Failed emails throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" stackId="a" fill="#10b981" name="Sent" />
              <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Email Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Email Type Distribution</CardTitle>
          <CardDescription>Breakdown by email category</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};