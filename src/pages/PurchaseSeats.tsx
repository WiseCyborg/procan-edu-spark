import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Users, AlertCircle } from "lucide-react";

const SEAT_PRICE = 49.99;

export default function PurchaseSeats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasRole, isLoading: rolesLoading } = useUserRole();
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const isAuthorized = hasRole('dispensary_manager') || hasRole('training_coordinator');

  useEffect(() => {
    if (!rolesLoading && !isAuthorized) {
      navigate('/dashboard');
      toast.error("Only Managers and Coordinators can purchase seats");
    }
  }, [rolesLoading, isAuthorized, navigate]);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.organizations) {
        setOrganization(profile.organizations);
      }
    };
    
    fetchOrganization();
  }, [user]);

  const totalPrice = (quantity * SEAT_PRICE).toFixed(2);

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please log in to purchase seats");
      return;
    }

    if (!organization) {
      toast.error("No organization found. Please contact support.");
      return;
    }

    if (!organization.admin_approved) {
      toast.error("Your organization is pending admin approval");
      return;
    }

    if (!organization.dispensary_number) {
      toast.error("Organization missing dispensary number. Please contact support.");
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'create-dispensary-payment-paypal',
        {
          body: {
            quantity,
            idempotencyKey
          }
        }
      );

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No PayPal URL returned");
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || "Failed to initiate purchase");
    } finally {
      setLoading(false);
    }
  };

  if (rolesLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/team-management")}
        className="mb-6"
      >
        ← Back to Team Management
      </Button>

      {organization && !organization.admin_approved && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your organization is pending admin approval. You cannot purchase seats yet.
          </AlertDescription>
        </Alert>
      )}

      {organization && !organization.dispensary_number && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your organization is missing a dispensary number. Please contact support.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <CardTitle>Purchase Training Seats</CardTitle>
          </div>
          <CardDescription>
            Buy bulk training seats for your organization at ${SEAT_PRICE} per seat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="quantity">Number of Seats</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={loading}
              >
                -
              </Button>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-center w-24"
                disabled={loading}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                disabled={loading}
              >
                +
              </Button>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Price per seat:</span>
              <span className="font-medium">${SEAT_PRICE}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Quantity:</span>
              <span className="font-medium">{quantity} seats</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-2xl font-bold text-primary">${totalPrice}</span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  What You'll Get:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• {quantity} training seat{quantity > 1 ? 's' : ''} for your organization</li>
                  <li>• Access to Maryland Responsible Vendor Training</li>
                  <li>• Official certificates upon completion</li>
                  <li>• Progress tracking and analytics dashboard</li>
                  <li>• Email support for all trainees</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            disabled={loading || !organization?.admin_approved || !organization?.dispensary_number}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Proceed to PayPal
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You will be redirected to PayPal to complete your secure payment
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
