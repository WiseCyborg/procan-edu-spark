import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfilePhotoUpload } from '@/components/profile/ProfilePhotoUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, User, Briefcase, MapPin, Phone } from 'lucide-react';

interface EnhancedProfileEditorProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const EnhancedProfileEditor = ({ userId, open, onClose, onSaved }: EnhancedProfileEditorProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(name)')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name?.trim() || null,
          last_name: profile.last_name?.trim() || null,
          phone: profile.phone?.trim() || null,
          date_of_birth: profile.date_of_birth || null,
          address: profile.address?.trim() || null,
          city: profile.city?.trim() || null,
          state: profile.state?.trim() || 'Maryland',
          zip_code: profile.zip_code?.trim() || null,
          emergency_contact_name: profile.emergency_contact_name?.trim() || null,
          emergency_contact_phone: profile.emergency_contact_phone?.trim() || null,
          mca_registration_number: profile.mca_registration_number?.trim() || null,
          job_title: profile.job_title?.trim() || null,
          organization: profile.organization?.trim() || null
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      
      onSaved?.();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User Profile (Admin)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Photo */}
          <Card>
            <CardContent className="flex justify-center py-6">
              <ProfilePhotoUpload
                userId={userId}
                currentPhotoUrl={profile?.profile_photo_url}
                onPhotoUpdate={(url) => setProfile({...profile, profile_photo_url: url})}
              />
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profile?.first_name || ''}
                    onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profile?.last_name || ''}
                    onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile?.phone || ''}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={profile?.date_of_birth || ''}
                    onChange={(e) => setProfile({...profile, date_of_birth: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Professional Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={profile?.job_title || ''}
                    onChange={(e) => setProfile({...profile, job_title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="mca_registration_number">MCA Registration Number</Label>
                  <Input
                    id="mca_registration_number"
                    value={profile?.mca_registration_number || ''}
                    onChange={(e) => setProfile({...profile, mca_registration_number: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={profile?.organizations?.name || profile?.organization || ''}
                  disabled={!!profile?.organization_id}
                  onChange={(e) => setProfile({...profile, organization: e.target.value})}
                />
                {profile?.organization_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Linked to organization ID: {profile.organization_id}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address & Emergency Contact */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Address & Emergency Contact</h3>
              </div>

              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={profile?.address || ''}
                  onChange={(e) => setProfile({...profile, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile?.city || ''}
                    onChange={(e) => setProfile({...profile, city: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profile?.state || 'Maryland'}
                    onChange={(e) => setProfile({...profile, state: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={profile?.zip_code || ''}
                    onChange={(e) => setProfile({...profile, zip_code: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={profile?.emergency_contact_name || ''}
                    onChange={(e) => setProfile({...profile, emergency_contact_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={profile?.emergency_contact_phone || ''}
                    onChange={(e) => setProfile({...profile, emergency_contact_phone: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
