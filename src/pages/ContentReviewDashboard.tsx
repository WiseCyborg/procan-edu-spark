import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface ReviewItem {
  id: string;
  content_type: string;
  location: string;
  urgency: string;
  ai_suggested_change: string;
  status: string;
  created_at: string;
  regulatory_update_id: string;
}

export default function ContentReviewDashboard() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pending');
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviewItems();
  }, [selectedTab]);

  const fetchReviewItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_review_queue')
        .select('*')
        .eq('status', selectedTab)
        .order('urgency', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviewItems(data || []);
    } catch (error) {
      console.error('Error fetching review items:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_review_queue')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      fetchReviewItems();
    } catch (error) {
      console.error('Error marking as completed:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const criticalItems = reviewItems.filter(i => i.urgency === 'critical');
  const highItems = reviewItems.filter(i => i.urgency === 'high');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Content Review Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and review content updates triggered by regulatory changes
        </p>
      </div>

      {/* Critical Alerts Banner */}
      {criticalItems.length > 0 && selectedTab === 'pending' && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>🚨 {criticalItems.length} Critical Items Require Immediate Attention</AlertTitle>
          <AlertDescription>
            These items are related to critical regulatory changes and must be reviewed as soon as possible.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reviewItems.filter(i => i.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {criticalItems.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {highItems.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reviewItems.filter(i => i.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Review Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="pending">
                <Clock className="h-4 w-4 mr-2" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                In Progress
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed
              </TabsTrigger>
            </TabsList>

            {['pending', 'in_progress', 'completed'].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-4">
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : reviewItems.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No {tab} items
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reviewItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{item.location}</h3>
                              <Badge variant={getUrgencyColor(item.urgency)}>
                                {item.urgency}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDistance(new Date(item.created_at), new Date(), { addSuffix: true })}
                            </p>
                          </div>
                          {item.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsCompleted(item.id)}
                              >
                                Mark Complete
                              </Button>
                            </div>
                          )}
                        </div>

                        {item.ai_suggested_change && (
                          <div className="bg-muted p-3 rounded-md mt-3">
                            <p className="text-sm font-medium mb-1">AI Suggested Changes:</p>
                            <p className="text-sm text-muted-foreground">
                              {item.ai_suggested_change}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
