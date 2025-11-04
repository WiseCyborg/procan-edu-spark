import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PurchaseSeatsDialog } from './PurchaseSeatsDialog';

interface SeatRequest {
  id: string;
  quantity: number;
  reason: string;
  status: string;
  created_at: string;
  requested_by: string;
  manager_notes: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function SeatRequestManager({ organizationId }: { organizationId: string }) {
  const [requests, setRequests] = useState<SeatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({});
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(0);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    
    const channel = supabase
      .channel('seat-requests-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'seat_requests', filter: `organization_id=eq.${organizationId}` },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('seat_requests' as any)
        .select(`
          *,
          profiles!seat_requests_requested_by_fkey(first_name, last_name, email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load seat requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, quantity: number) => {
    setApprovingRequestId(requestId);
    setPurchaseQuantity(quantity);
    setShowPurchaseModal(true);
  };

  const handleReject = async (requestId: string) => {
    if (!managerNotes[requestId]) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('seat_requests' as any)
        .update({
          status: 'rejected',
          manager_notes: managerNotes[requestId],
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
      toast.success('Request rejected');
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePurchaseComplete = async () => {
    if (approvingRequestId) {
      try {
        await supabase
          .from('seat_requests' as any)
          .update({
            status: 'approved',
            manager_notes: managerNotes[approvingRequestId] || 'Approved and seats purchased',
            approved_at: new Date().toISOString()
          })
          .eq('id', approvingRequestId);
        
        toast.success('Seats purchased and request approved!');
        setApprovingRequestId(null);
        fetchRequests();
      } catch (error) {
        console.error('Error updating request:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending seat requests
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {pendingRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {request.profiles.first_name} {request.profiles.last_name}
                    </h4>
                    <p className="text-sm text-muted-foreground">{request.profiles.email}</p>
                  </div>
                  <Badge variant="outline">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium">Requested Quantity</p>
                  <p className="text-2xl font-bold">{request.quantity} seats</p>
                </div>

                {request.reason && (
                  <div>
                    <p className="text-sm font-medium">Reason</p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Manager Notes (Optional)</p>
                  <Textarea
                    value={managerNotes[request.id] || ''}
                    onChange={(e) => setManagerNotes({ ...managerNotes, [request.id]: e.target.value })}
                    placeholder="Add notes about this request..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(request.id, request.quantity)}
                    disabled={processingId === request.id}
                    className="flex-1"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve & Purchase
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="flex-1"
                  >
                    {processingId === request.id ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rejecting...</>
                    ) : (
                      <><XCircle className="mr-2 h-4 w-4" />Reject</>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Requested {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PurchaseSeatsDialog
        organizationId={organizationId}
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        prefilledQuantity={purchaseQuantity}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
}
