import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { User, Save, Calendar, MapPin, Phone, Settings, AlertCircle, ArrowRight } from 'lucide-react';
import { VerificationPreferencesSetup } from '@/components/auth/VerificationPreferencesSetup';
import { ProfileChangeHistoryViewer } from '@/components/admin/ProfileChangeHistoryViewer';

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  organization: string;
  job_title: string;
  mca_registration_number: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { roles, isLoading: rolesLoading } = useUserRole();
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    phone: '',
    organization: '',
    job_title: '',
    mca_registration_number: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: 'Maryland',
    zip_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [changedFields, setChangedFields] = useState<Set<keyof ProfileData>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          return;
        }

        if (data) {
          const loadedProfile = {
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || '',
            organization: data.organization || '',
            job_title: data.job_title || '',
            mca_registration_number: data.mca_registration_number || '',
            date_of_birth: data.date_of_birth || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || 'Maryland',
            zip_code: data.zip_code || '',
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || ''
          };
          setProfile(loadedProfile);
          setOriginalProfile(loadedProfile);
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    
    // Track which fields have changed
    if (originalProfile && value !== originalProfile[field]) {
      setChangedFields(prev => new Set(prev).add(field));
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }
  };

  const validateProfile = () => {
    const errors: string[] = [];
    
    if (profile.date_of_birth) {
      const birthDate = new Date(profile.date_of_birth);
      const today = new Date();
      if (birthDate > today) {
        errors.push("Date of birth cannot be in the future");
      }
    }
    
    if (profile.phone && !/^[\d\s\-\(\)\+]+$/.test(profile.phone)) {
      errors.push("Please enter a valid phone number");
    }
    
    if (profile.emergency_contact_phone && !/^[\d\s\-\(\)\+]+$/.test(profile.emergency_contact_phone)) {
      errors.push("Please enter a valid emergency contact phone number");
    }
    
    if (profile.zip_code && !/^\d{5}(-\d{4})?$/.test(profile.zip_code)) {
      errors.push("Please enter a valid ZIP code");
    }
    
    return errors;
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate profile data
    const validationErrors = validateProfile();
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors[0],
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Prepare profile data with proper null handling
      const profileData = {
        user_id: user.id,
        first_name: profile.first_name.trim() || null,
        last_name: profile.last_name.trim() || null,
        phone: profile.phone.trim() || null,
        organization: profile.organization.trim() || null,
        job_title: profile.job_title.trim() || null,
        mca_registration_number: profile.mca_registration_number.trim() || null,
        date_of_birth: profile.date_of_birth || null,
        address: profile.address.trim() || null,
        city: profile.city.trim() || null,
        state: profile.state.trim() || 'Maryland',
        zip_code: profile.zip_code.trim() || null,
        emergency_contact_name: profile.emergency_contact_name.trim() || null,
        emergency_contact_phone: profile.emergency_contact_phone.trim() || null,
      };

      // First try to update existing profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let error;
      
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);
        error = insertError;
      }

      if (error) {
        console.error('Error saving profile:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        let errorMessage = `Failed to save profile changes: ${error.message}`;
        
        if (error.code === '23505') {
          errorMessage = "A profile with this information already exists";
        } else if (error.code === '22007') {
          errorMessage = "Invalid date format. Please check your date of birth";
        } else if (error.code === '42501') {
          errorMessage = "You don't have permission to update your profile. Please ensure you're properly logged in or contact support.";
        } else if (error.code === '23502') {
          errorMessage = "Please fill in all required fields marked with *";
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `${changedFields.size} field(s) updated successfully`
      });
      
      // Update baseline after successful save
      setOriginalProfile(profile);
      setChangedFields(new Set());
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast({
        title: "Error",
        description: "Failed to save profile changes",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || rolesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <User className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        </div>
        <div className="flex space-x-2">
          {roles.map(role => (
            <Badge key={role} variant="secondary">
              {role.replace('_', ' ').toUpperCase()}
            </Badge>
          ))}
        </div>
      </div>

      {changedFields.size > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <AlertCircle className="w-5 h-5" />
              Pending Changes ({changedFields.size})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Array.from(changedFields).map(field => (
                <li key={field} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="text-muted-foreground">
                    {originalProfile?.[field] || '(empty)'} → {profile[field] || '(empty)'}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile Information
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Verification Settings
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            My Change History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={profile.date_of_birth}
                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={profile.organization}
                onChange={(e) => handleInputChange('organization', e.target.value)}
                placeholder="Enter organization name"
              />
            </div>

            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={profile.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder="Enter job title"
              />
            </div>

            <div>
              <Label htmlFor="mca_registration_number">MCA Registration Number</Label>
              <Input
                id="mca_registration_number"
                value={profile.mca_registration_number}
                onChange={(e) => handleInputChange('mca_registration_number', e.target.value)}
                placeholder="Enter MCA registration number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Address Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <Textarea
                id="address"
                value={profile.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter street address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  value={profile.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={profile.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="Enter state"
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Emergency Contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
              <Input
                id="emergency_contact_name"
                value={profile.emergency_contact_name}
                onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                placeholder="Enter emergency contact name"
              />
            </div>

            <div>
              <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
              <Input
                id="emergency_contact_phone"
                value={profile.emergency_contact_phone}
                onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                placeholder="Enter emergency contact phone"
              />
            </div>
          </CardContent>
        </Card>
      </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={isSaving} className="flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="verification" className="space-y-6">
          <VerificationPreferencesSetup />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          {user && <ProfileChangeHistoryViewer userId={user.id} showAsUser={true} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;