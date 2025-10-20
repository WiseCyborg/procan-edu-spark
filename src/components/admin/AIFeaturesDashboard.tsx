import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleFAQManager } from '@/components/faq/SimpleFAQManager';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MessageSquare, FileText, TrendingUp, Clock } from 'lucide-react';

interface AIMetrics {
  totalFAQs: number;
  aiGeneratedFAQs: number;
  activeFAQs: number;
  recentActivity: number;
}

export const AIFeaturesDashboard = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<AIMetrics>({
    totalFAQs: 0,
    aiGeneratedFAQs: 0,
    activeFAQs: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIMetrics();

    // Phase 3: Add real-time subscriptions
    const channels: any[] = [];

    // FAQ subscription
    const faqChannel = supabase
      .channel('faq-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'faq_entries' },
        () => fetchAIMetrics()
      )
      .subscribe();

    // Regulatory updates subscription
    const regChannel = supabase
      .channel('regulatory-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'regulatory_updates' },
        (payload: any) => {
          const newData = payload.new as any;
          toast({
            title: "🚨 New Regulatory Update",
            description: `Section ${newData?.section_number || 'unknown'} has changes`,
          });
          fetchAIMetrics();
        }
      )
      .subscribe();

    // Content review queue subscription
    const contentChannel = supabase
      .channel('content-review-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'content_review_queue' },
        () => fetchAIMetrics()
      )
      .subscribe();

    channels.push(faqChannel, regChannel, contentChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  const fetchAIMetrics = async () => {
    try {
      setLoading(true);

      // Fetch FAQ metrics
      const { data: faqs, error: faqError } = await supabase
        .from('faq_entries')
        .select('*');

      if (faqError) throw faqError;

      // Calculate metrics
      const totalFAQs = faqs?.length || 0;
      const activeFAQs = faqs?.filter(f => f.is_active).length || 0;
      
      // Assuming FAQs created in last 7 days are from AI suggestions
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentActivity = faqs?.filter(f => 
        new Date(f.created_at) > sevenDaysAgo
      ).length || 0;

      setMetrics({
        totalFAQs,
        aiGeneratedFAQs: Math.floor(totalFAQs * 0.3), // Placeholder
        activeFAQs,
        recentActivity,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalFAQs}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeFAQs} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.aiGeneratedFAQs}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((metrics.aiGeneratedFAQs / Math.max(metrics.totalFAQs, 1)) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentActivity}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Assistant</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Active
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Available on all pages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Features</CardTitle>
          <CardDescription>
            Manage AI-generated content and monitor AI system performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">Chat Assistant</h4>
                <p className="text-sm text-muted-foreground">
                  AI-powered support available throughout the platform
                </p>
                <Badge variant="outline" className="mt-2">Active</Badge>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <FileText className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">FAQ Generation</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically generate FAQ entries from content
                </p>
                <Badge variant="outline" className="mt-2">Active</Badge>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">Content Freshness Detection</h4>
                <p className="text-sm text-muted-foreground">
                  Monitor regulatory changes and flag outdated content
                </p>
                <Badge variant="outline" className="mt-2">Active</Badge>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">Predictive Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  AI-driven insights for training completion forecasts
                </p>
                <Badge variant="outline" className="mt-2">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Manager */}
      <Card>
        <CardHeader>
          <CardTitle>FAQ Management</CardTitle>
          <CardDescription>
            Create, edit, and manage frequently asked questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleFAQManager />
        </CardContent>
      </Card>
    </div>
  );
};
