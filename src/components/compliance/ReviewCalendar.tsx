import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, CheckCircle2, Clock, AlertTriangle, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { useState } from 'react';

interface ScheduledReview {
  id: string;
  organization_id: string;
  review_type: string;
  review_name: string;
  scheduled_date: string;
  due_date: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  findings: string | null;
  organizations?: {
    name: string;
  };
}

interface ReviewCalendarProps {
  organizationId?: string;
  showAll?: boolean;
}

export const ReviewCalendar = ({ organizationId, showAll = false }: ReviewCalendarProps) => {
  const [selectedReview, setSelectedReview] = useState<ScheduledReview | null>(null);
  const [findings, setFindings] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['scheduled-reviews', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_reviews')
        .select(`
          *,
          organizations (name)
        `)
        .order('scheduled_date', { ascending: true });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (!showAll) {
        query = query.neq('status', 'cancelled');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduledReview[];
    }
  });

  const completeReviewMutation = useMutation({
    mutationFn: async ({ reviewId, findings }: { reviewId: string; findings: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('scheduled_reviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          findings
        })
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reviews'] });
      toast.success('Review marked as completed');
      setIsDialogOpen(false);
      setSelectedReview(null);
      setFindings('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete review: ${error.message}`);
    }
  });

  const startReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('scheduled_reviews')
        .update({ status: 'in_progress' })
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reviews'] });
      toast.success('Review started');
    }
  });

  const getStatusBadge = (review: ScheduledReview) => {
    switch (review.status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'scheduled':
        if (isPast(new Date(review.due_date))) {
          return <Badge variant="destructive">Overdue</Badge>;
        }
        if (differenceInDays(new Date(review.scheduled_date), new Date()) <= 7) {
          return <Badge className="bg-warning text-warning-foreground">Due Soon</Badge>;
        }
        return <Badge variant="secondary">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{review.status}</Badge>;
    }
  };

  const getReviewTypeIcon = (type: string) => {
    switch (type) {
      case 'quarterly':
        return <Calendar className="h-4 w-4 text-primary" />;
      case 'annual':
        return <FileCheck className="h-4 w-4 text-green-500" />;
      case 'incident_triggered':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const overdueReviews = reviews?.filter(r => 
    r.status !== 'completed' && r.status !== 'cancelled' && isPast(new Date(r.due_date))
  ) || [];

  const upcomingReviews = reviews?.filter(r => 
    r.status !== 'completed' && r.status !== 'cancelled' && !isPast(new Date(r.due_date))
  ) || [];

  const completedReviews = reviews?.filter(r => r.status === 'completed') || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading reviews...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Compliance Review Calendar
        </CardTitle>
        <CardDescription>
          Quarterly and annual compliance reviews for MCA requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overdue Section */}
        {overdueReviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue ({overdueReviews.length})
            </h4>
            {overdueReviews.map((review) => (
              <div 
                key={review.id}
                className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getReviewTypeIcon(review.review_type)}
                  <div>
                    <p className="font-medium">{review.review_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(review.due_date), 'MMM d, yyyy')}
                      {review.organizations && ` • ${review.organizations.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(review)}
                  <Dialog open={isDialogOpen && selectedReview?.id === review.id} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setSelectedReview(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm"
                        onClick={() => setSelectedReview(review)}
                      >
                        Complete Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Complete Review: {review.review_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Findings & Notes</Label>
                          <Textarea
                            placeholder="Document your review findings, observations, and any corrective actions needed..."
                            value={findings}
                            onChange={(e) => setFindings(e.target.value)}
                            rows={6}
                          />
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => completeReviewMutation.mutate({ 
                            reviewId: review.id, 
                            findings 
                          })}
                          disabled={completeReviewMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Completed
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Section */}
        {upcomingReviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming ({upcomingReviews.length})
            </h4>
            {upcomingReviews.slice(0, 5).map((review) => (
              <div 
                key={review.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getReviewTypeIcon(review.review_type)}
                  <div>
                    <p className="font-medium">{review.review_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Scheduled: {format(new Date(review.scheduled_date), 'MMM d, yyyy')} • 
                      Due: {format(new Date(review.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(review)}
                  {review.status === 'scheduled' && (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => startReviewMutation.mutate(review.id)}
                    >
                      Start Review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Section */}
        {completedReviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-green-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedReviews.length})
            </h4>
            {completedReviews.slice(0, 3).map((review) => (
              <div 
                key={review.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getReviewTypeIcon(review.review_type)}
                  <div>
                    <p className="font-medium">{review.review_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Completed: {format(new Date(review.completed_at!), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                {getStatusBadge(review)}
              </div>
            ))}
          </div>
        )}

        {!reviews || reviews.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No compliance reviews scheduled yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
