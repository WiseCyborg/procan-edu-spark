import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

            {seatStatus && (
              <>
                {/* Warning when join code approaching limit */}
                {seatStatus.available_seats > 0 && seatStatus.available_seats < 5 && (
                  <Alert variant="default" className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="font-bold text-amber-800 dark:text-amber-200">⚠️ Join Code Approaching Limit</AlertTitle>
                    <AlertDescription className="space-y-2 text-amber-800 dark:text-amber-200">
                      <p>Only {seatStatus.available_seats} seats remaining. Join code will stop working when seats are exhausted.</p>
                      <Button 
                        onClick={() => navigate("/purchase-seats")} 
                        variant="outline"
                        size="sm"
                        className="mt-2 border-amber-600 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase More Seats
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {seatStatus.available_seats === 0 ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle className="font-bold">🚫 No Seats Available</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>You cannot invite or assign employees until you purchase more training seats.</p>
                      <Button 
                        onClick={() => navigate("/purchase-seats")} 
                        variant="destructive"
                        size="sm"
                        className="mt-2"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase Seats Now
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : seatStatus.available_seats < 5 ? (
                  <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <AlertTitle className="font-bold text-yellow-800 dark:text-yellow-200">⚠️ Low Seat Inventory</AlertTitle>
                    <AlertDescription className="space-y-2 text-yellow-800 dark:text-yellow-200">
                      <p>Only {seatStatus.available_seats} seats remaining. Purchase more to avoid disruption.</p>
                      <Button 
                        onClick={() => navigate("/purchase-seats")} 
                        variant="outline"
                        size="sm"
                        className="mt-2 border-yellow-600 text-yellow-800 hover:bg-yellow-100 dark:text-yellow-200 dark:hover:bg-yellow-900"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase More Seats
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
