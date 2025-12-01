import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, UserPlus, UserMinus, ArrowRightLeft, Package, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';

interface SeatOperation {
  id: string;
  operation_type: string;
  from_user_id: string | null;
  to_user_id: string | null;
  performed_by: string;
  reason: string | null;
  created_at: string;
  metadata: any;
  performer_name?: string;
  to_user_name?: string;
  from_user_name?: string;
}

interface SeatHistoryTabProps {
  organizationId: string;
}

export function SeatHistoryTab({ organizationId }: SeatHistoryTabProps) {
  const [operations, setOperations] = useState<SeatOperation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('seat-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seat_operation_history',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('seat_operation_history' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user names for operations
      const userIds = new Set<string>();
      data?.forEach((op: any) => {
        userIds.add(op.performed_by);
        if (op.from_user_id) userIds.add(op.from_user_id);
        if (op.to_user_id) userIds.add(op.to_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', Array.from(userIds));

      const userMap = new Map(
        profiles?.map((p) => [
          p.user_id,
          `${p.first_name} ${p.last_name}`,
        ])
      );

      const enrichedData = data?.map((op: any) => ({
        id: op.id,
        operation_type: op.operation_type,
        from_user_id: op.from_user_id,
        to_user_id: op.to_user_id,
        performed_by: op.performed_by,
        reason: op.reason,
        created_at: op.created_at,
        metadata: op.metadata,
        performer_name: userMap.get(op.performed_by) || 'Unknown',
        to_user_name: op.to_user_id ? userMap.get(op.to_user_id) : null,
        from_user_name: op.from_user_id ? userMap.get(op.from_user_id) : null,
      }));

      setOperations(enrichedData || []);
    } catch (error) {
      console.error('Error fetching seat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'assigned':
        return <UserPlus className="h-4 w-4" />;
      case 'unassigned':
        return <UserMinus className="h-4 w-4" />;
      case 'transferred':
        return <ArrowRightLeft className="h-4 w-4" />;
      case 'created':
        return <Package className="h-4 w-4" />;
      case 'purchased':
        return <ShoppingCart className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'assigned':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unassigned':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'transferred':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'purchased':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'created':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOperationDescription = (op: SeatOperation) => {
    switch (op.operation_type) {
      case 'assigned':
        return `Seat assigned to ${op.to_user_name}`;
      case 'unassigned':
        return `Seat unassigned from ${op.from_user_name}`;
      case 'transferred':
        return `Seat transferred from ${op.from_user_name} to ${op.to_user_name}`;
      case 'purchased':
        return `Purchased ${op.metadata?.quantity || 'seats'}`;
      case 'created':
        return 'New seat created';
      default:
        return op.operation_type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Seat Operation History
        </CardTitle>
        <CardDescription>
          Complete audit trail of all seat management operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {operations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No seat operations recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {operations.map((op) => (
                <div
                  key={op.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={getOperationColor(op.operation_type)}
                    >
                      {getOperationIcon(op.operation_type)}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{getOperationDescription(op)}</p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(op.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Performed by {op.performer_name}
                    </p>
                    
                    {op.reason && (
                      <p className="text-sm text-muted-foreground italic">
                        Reason: {op.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
