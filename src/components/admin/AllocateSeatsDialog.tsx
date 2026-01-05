import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  const handleAllocate = async () => {
    if (quantity < 1 || quantity > 100) {
      toast.error('Please enter a quantity between 1 and 100');
      return;
    }

    setLoading(true);
    try {
      // Use secure RPC function - handles auth, validation, audit trail
      const { data, error } = await supabase.rpc('allocate_additional_seats', {
        p_org_id: organizationId,
        p_seats_to_add: quantity,
        p_note: `Admin allocation of ${quantity} seats`
      });

      if (error) throw error;

      // Invalidate seat queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['organization-seats'] });
      queryClient.invalidateQueries({ queryKey: ['seats'] });
      queryClient.invalidateQueries({ queryKey: ['org-seats'] });

      toast.success(`${quantity} seats allocated to ${organizationName}`);
      onAllocated?.();
      onOpenChange(false);
      setQuantity(10); // Reset for next use
    } catch (error: any) {
      console.error('Seat allocation error:', error);
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
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter 1-100 seats to allocate
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAllocate} 
            disabled={loading || quantity < 1 || quantity > 100}
          >
            {loading ? 'Allocating...' : `Allocate ${quantity} Seats`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
