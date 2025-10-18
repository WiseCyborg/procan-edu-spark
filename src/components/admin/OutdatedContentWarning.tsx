import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Scale } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface OutdatedContent {
  content_type: string;
  content_id: string;
  location: string;
  last_updated_at: string;
  days_since_update: number;
  relevant_regulatory_updates: number;
  urgency_score: number;
  status: string;
}

export const OutdatedContentWarning = () => {
  const [outdatedContent, setOutdatedContent] = useState<OutdatedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchOutdated();
  }, []);

  const fetchOutdated = async () => {
    try {
      const { data, error } = await supabase.rpc('detect_outdated_content');
      
      if (error) {
        console.error('Error fetching outdated content:', error);
        return;
      }
      
      setOutdatedContent(data || []);
    } catch (err) {
      console.error('Error in fetchOutdated:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'hsl(var(--destructive))';
      case 'high': return 'hsl(25, 95%, 53%)';
      case 'medium': return 'hsl(48, 96%, 53%)';
      default: return 'hsl(var(--muted))';
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading content health...</p>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = outdatedContent.filter(c => c.status === 'critical').length;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Outdated Content Warnings
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive">
              {criticalCount} Critical
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {outdatedContent.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            ✅ All content is up to date!
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {outdatedContent.slice(0, 10).map((item) => (
                <div 
                  key={`${item.content_type}-${item.content_id}`} 
                  className="flex items-center justify-between border-l-4 pl-4 py-2" 
                  style={{ borderColor: getStatusColor(item.status) }}
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.location}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Last updated: {formatDistance(new Date(item.last_updated_at), new Date(), { addSuffix: true })}
                      </span>
                      <span className="flex items-center">
                        <Scale className="h-3 w-3 mr-1" />
                        {item.relevant_regulatory_updates} regulation changes
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => navigate(`/admin/content-review?id=${item.content_id}`)}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
            
            {outdatedContent.length > 10 && (
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={() => navigate('/admin/content-review')}
              >
                View All {outdatedContent.length} Items
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
