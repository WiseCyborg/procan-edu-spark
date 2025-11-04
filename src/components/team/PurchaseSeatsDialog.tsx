import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseSeatsDialogProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
  prefilledQuantity?: number;
}

export function PurchaseSeatsDialog({ 
  organizationId, 
  open, 
  onOpenChange, 
  onPurchaseComplete,
  prefilledQuantity 
}: PurchaseSeatsDialogProps) {
  const [quantity, setQuantity] = useState(prefilledQuantity || 10);
  const [loading, setLoading] = useState(false);
  const PRICE_PER_SEAT = 49.99;

  const handlePurchase = async () => {
    if (quantity < 1) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-dispensary-payment-paypal', {
        body: {
          quantity,
          idempotencyKey: `${organizationId}-${Date.now()}`
        }
      });

      if (error) throw error;

      if (data?.approvalUrl) {
        // Redirect to PayPal
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL returned');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to initiate purchase');
    } finally {
      setLoading(false);
    }
  };

  const total = (quantity * PRICE_PER_SEAT).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Purchase Training Seats</DialogTitle>
          <DialogDescription>
            Add more training seats for your organization
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Number of Seats</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Price per seat:</span>
              <span className="font-medium">${PRICE_PER_SEAT}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Quantity:</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>${total}</span>
            </div>
          </div>

          <Button 
            onClick={handlePurchase} 
            disabled={loading || quantity < 1}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
            ) : (
              <><ShoppingCart className="mr-2 h-4 w-4" />Proceed to PayPal</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
