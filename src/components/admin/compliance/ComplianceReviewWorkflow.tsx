import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ComplianceReviewWorkflow = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});

  const { data: reviewQueue, isLoading } = useQuery({
    queryKey: ['compliance-review-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_review_queue')
        .select(`
          *,
          course_modules!inner(
            id,
            module_number,
            title,
            comar_reference,
            last_comar_review_date
          )
        `)
        .order('urgency', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const approveReviewMutation = useMutation({
    mutationFn: async ({ reviewId, moduleId, notes }: { reviewId: string; moduleId: string; notes: string }) => {
      const today = new Date().toISOString();

      // Update review queue item
      const { error: queueError } = await supabase
        .from('content_review_queue')
        .update({
          status: 'completed',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: today,
          reviewer_notes: notes
        })
        .eq('id', reviewId);

      if (queueError) throw queueError;

      // Update module's last review date
      const { error: moduleError } = await supabase
        .from('course_modules')
        .update({ last_comar_review_date: today })
        .eq('id', moduleId);

      if (moduleError) throw moduleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-review-queue'] });
      toast({
        title: 'Review Completed',
        description: 'Module marked as COMAR compliant',
      });
      setReviewNotes({});
    },
    onError: (error) => {
      toast({
        title: 'Review Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getUrgencyVariant = (urgency: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading review queue...</div>;
  }

  const pendingReviews = reviewQueue?.filter(r => r.status === 'pending') || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>COMAR Compliance Review Workflow</CardTitle>
          <CardDescription>
            Formal review process for ensuring all course content meets COMAR 14.17.05 requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{pendingReviews.length}</div>
                  <div className="text-sm text-muted-foreground">Pending Reviews</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {reviewQueue?.filter(r => r.status === 'completed').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {pendingReviews.filter(r => r.urgency === 'critical').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Critical Priority</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {pendingReviews.map((review: any) => (
              <Card key={review.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getUrgencyIcon(review.urgency)}
                        <Badge variant={getUrgencyVariant(review.urgency)}>
                          {review.urgency.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Due: {new Date(review.due_date).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-lg">
                        Module {review.course_modules.module_number}: {review.course_modules.title}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        COMAR Reference: {review.course_modules.comar_reference || 'Not specified'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-semibold mb-1">AI Suggested Review Focus:</p>
                    <p className="text-sm text-muted-foreground">{review.ai_suggested_change}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Review Notes</label>
                    <Textarea
                      placeholder="Document your compliance review findings, verification steps taken, and any recommendations..."
                      value={reviewNotes[review.id] || ''}
                      onChange={(e) => setReviewNotes({ ...reviewNotes, [review.id]: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveReviewMutation.mutate({
                        reviewId: review.id,
                        moduleId: review.course_modules.id,
                        notes: reviewNotes[review.id] || 'COMAR compliance verified'
                      })}
                      disabled={approveReviewMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Mark Compliant
                    </Button>
                    <Button variant="outline">
                      <XCircle className="h-4 w-4 mr-2" />
                      Request Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {pendingReviews.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-semibold">All modules reviewed!</p>
                <p className="text-sm">No pending COMAR compliance reviews at this time.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
