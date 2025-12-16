import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AllocateSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  onAllocated?: () => void;
}

export const AllocateSeatsDialog = ({ 
  open, 
  onOpenChange, 
  organizationId,
  organizationName,
  onAllocated 
}: AllocateSeatsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(10);

  const handleAllocate = async () => {
    if (quantity < 1 || quantity > 100) {
      toast.error('Please enter a quantity between 1 and 100');
      return;
    }

    setLoading(true);
    try {
      // Get course ID
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .ilike('title', '%responsible vendor%')
        .limit(1)
        .single();

      if (!course) throw new Error('Course not found');

      // Create a purchase record first
      const idempotencyKey = `admin-${organizationId}-${Date.now()}`;
      const { data: purchase, error: purchaseError } = await supabase
        .from('rvt_purchases')
        .insert({
          organization_id: organizationId,
          quantity: quantity,
          amount_paid: 0,
          idempotency_key: idempotencyKey,
          payment_method: 'admin_allocated',
          status: 'completed',
        })
        .select('id')
        .single();

      if (purchaseError) throw purchaseError;

      if (purchaseError) throw purchaseError;

      // Create seats with purchase_id
      const seats = Array.from({ length: quantity }, () => ({
        organization_id: organizationId,
        course_id: course.id,
        purchase_id: purchase.id,
        status: 'available',
      }));

      const { error } = await supabase
        .from('rvt_seats')
        .insert(seats);

      if (error) throw error;

      toast.success(`${quantity} seats allocated to ${organizationName}`);
      onAllocated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to allocate seats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Allocate Additional Seats</DialogTitle>
          <DialogDescription>
            Add training seats to {organizationName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Number of Seats</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Enter 1-100 seats to allocate
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAllocate} disabled={loading}>
            {loading ? 'Allocating...' : `Allocate ${quantity} Seats`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
