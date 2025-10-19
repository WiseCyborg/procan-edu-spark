import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Users } from "lucide-react";

const SEAT_PRICE = 49.99;

export default function PurchaseSeats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);

  const totalPrice = (quantity * SEAT_PRICE).toFixed(2);

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please log in to purchase seats");
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    setLoading(true);
    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, organizations(*)")
        .eq("user_id", user.id)
        .single();

      if (!profile?.organization_id) {
        toast.error("No organization found for your account");
        return;
      }

      // Create dispensary application for purchase
      const { data: application, error: appError } = await supabase
        .from("dispensary_applications")
        .insert({
          organization_name: profile.organizations.name,
          contact_person: profile.organizations.contact_person,
          contact_email: profile.organizations.contact_email,
          contact_phone: profile.organizations.contact_phone,
          address: profile.organizations.address,
          license_number: profile.organizations.license_number,
          requested_credits: quantity,
          application_status: "approved"
        })
        .select()
        .single();

      if (appError) throw appError;

      // Create PayPal order
      const { data: paypalData, error: paypalError } = await supabase.functions.invoke(
        "create-dispensary-payment-paypal",
        {
          body: {
            applicationId: application.id,
            credits: quantity
          }
        }
      );

      if (paypalError) throw paypalError;

      // Redirect to PayPal
      if (paypalData?.approvalUrl) {
        window.location.href = paypalData.approvalUrl;
      } else {
        throw new Error("Failed to create PayPal order");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || "Failed to initiate purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/team-management")}
        className="mb-6"
      >
        ← Back to Team Management
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <CardTitle>Purchase Training Seats</CardTitle>
          </div>
          <CardDescription>
            Buy bulk training seats for your organization at $49.99 per seat
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
            disabled={loading}
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
