import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: {
    id: string;
    organization_name: string;
    contact_person: string;
    contact_email: string;
    contact_phone: string;
    address: string;
    license_number: string;
  };
  onSaved?: () => void;
}

export const EditOrganizationDialog = ({ 
  open, 
  onOpenChange, 
  organization,
  onSaved 
}: EditOrganizationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: organization.organization_name || '',
    contact_person: organization.contact_person || '',
    contact_email: organization.contact_email || '',
    contact_phone: organization.contact_phone || '',
    address: organization.address || '',
    license_number: organization.license_number || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dispensary_applications')
        .update({
          organization_name: formData.organization_name,
          contact_person: formData.contact_person,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          address: formData.address,
          license_number: formData.license_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast.success('Organization details updated');
      onSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Organization Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="org_name">Organization Name</Label>
            <Input
              id="org_name"
              value={formData.organization_name}
              onChange={(e) => setFormData(prev => ({ ...prev, organization_name: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="license">License Number</Label>
            <Input
              id="license"
              value={formData.license_number}
              onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
