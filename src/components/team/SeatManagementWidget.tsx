import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Users, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

interface SeatStatus {
  total_purchased: number;
  available_seats: number;
  assigned_seats: number;
  used_seats: number;
  utilization_percentage: number;
}

interface SeatManagementWidgetProps {
  organizationId: string;
}

export function SeatManagementWidget({ organizationId }: SeatManagementWidgetProps) {
  const navigate = useNavigate();
  const [seatStatus, setSeatStatus] = useState<SeatStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeatStatus();

    // Subscribe to real-time seat changes
    const channel = supabase
      .channel('seat-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rvt_seats',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('Seat change detected:', payload);
          fetchSeatStatus();
          
          // Show toast notifications
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New seat allocated!",
              description: "A seat has been assigned to a student.",
            });
          } else if (payload.eventType === 'UPDATE' && (payload.new as any)?.status === 'used') {
            toast({
              title: "Student completed training!",
              description: "A seat has been marked as used.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const fetchSeatStatus = async () => {
    try {
      const { data, error } = await supabase
        .rpc("get_organization_seat_status" as any, { org_id: organizationId });

      if (error) throw error;
      
      const seatData = Array.isArray(data) ? data[0] : data;
      setSeatStatus(seatData || {
        total_purchased: 0,
        available_seats: 0,
        assigned_seats: 0,
        used_seats: 0,
        utilization_percentage: 0
      });
    } catch (error) {
      console.error("Error fetching seat status:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seat Utilization
            </CardTitle>
            <CardDescription>Track your training seat inventory</CardDescription>
          </div>
          <Button onClick={() => navigate("/purchase-seats")} size="sm">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Purchase More
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-full bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 w-full bg-muted animate-pulse rounded" />
              <div className="h-24 w-full bg-muted animate-pulse rounded" />
              <div className="h-24 w-full bg-muted animate-pulse rounded" />
              <div className="h-24 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Utilization Rate</span>
                <span className="font-medium">{seatStatus?.utilization_percentage || 0}%</span>
              </div>
              <Progress value={seatStatus?.utilization_percentage || 0} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Total Seats
                </div>
                <p className="text-2xl font-bold">{seatStatus?.total_purchased || 0}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Used Seats
                </div>
                <p className="text-2xl font-bold text-green-600">{seatStatus?.used_seats || 0}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Assigned
                </div>
                <p className="text-2xl font-bold text-yellow-600">{seatStatus?.assigned_seats || 0}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-blue-600" />
                  Available
                </div>
                <p className="text-2xl font-bold text-blue-600">{seatStatus?.available_seats || 0}</p>
              </div>
            </div>

            {(seatStatus?.available_seats || 0) < 5 && seatStatus && seatStatus.total_purchased > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Running low on seats! Consider purchasing more.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
