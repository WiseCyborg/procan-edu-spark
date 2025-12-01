import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShoppingCart, Loader2 } from 'lucide-react';

interface RequestSeatsFormProps {
  organizationId: string;
  onRequestSubmitted?: () => void;
}

export function RequestSeatsForm({ organizationId, onRequestSubmitted }: RequestSeatsFormProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !quantity || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      toast.error('Please enter a valid quantity (1-100)');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('request-additional-seats', {
        body: {
          quantity: qty,
          reason: reason.trim(),
          organizationId,
          requesterId: user.id,
        },
      });

      if (error) throw error;

      toast.success('Seat request submitted successfully', {
        description: 'Your manager will be notified and can approve the request.',
      });

      // Reset form
      setQuantity('');
      setReason('');
      
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (error: any) {
      console.error('Error requesting seats:', error);
      toast.error('Failed to submit request', {
        description: error.message || 'Please try again or contact support',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Request Additional Seats
        </CardTitle>
        <CardDescription>
          Submit a request to your manager to purchase more training seats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Number of Seats Needed</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="100"
              placeholder="e.g., 10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Justification</Label>
            <Textarea
              id="reason"
              placeholder="Why do you need additional seats? (e.g., hiring 10 new employees, seasonal staff increase)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Provide details to help your manager approve the request quickly
            </p>
          </div>

          <Button type="submit" disabled={loading || !quantity || !reason} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
