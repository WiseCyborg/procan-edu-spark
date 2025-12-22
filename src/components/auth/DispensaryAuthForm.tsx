import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, CreditCard, Eye, EyeOff } from 'lucide-react';

const DispensaryAuthForm = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('apply');
  
  // Application form state
  const [organizationName, setOrganizationName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [requestedCredits, setRequestedCredits] = useState(10);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleDispensaryApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('dispensary_applications')
        .insert({
          organization_name: organizationName,
          contact_person: contactPerson,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address,
          license_number: licenseNumber,
          requested_credits: requestedCredits,
        });

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: "Your dispensary application has been submitted for admin review. You'll receive an email with next steps.",
      });

      // Clear form
      setOrganizationName('');
      setContactPerson('');
      setContactEmail('');
      setContactPhone('');
      setAddress('');
      setLicenseNumber('');
      setRequestedCredits(10);
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDispensaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Success",
        description: "Successfully signed in! Redirecting to dispensary dashboard...",
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-green-600" />
            <CardTitle className="text-2xl font-bold text-green-700">
              Dispensary Portal
            </CardTitle>
          </div>
          <p className="text-muted-foreground">Manage employee training & certification</p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="apply">Apply for Access</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>
            
            <TabsContent value="apply">
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <h3 className="font-semibold text-green-800 mb-2">Dispensary Application Process</h3>
                <ol className="text-sm text-green-700 space-y-1">
                  <li>1. Submit application with dispensary information</li>
                  <li>2. Admin reviews and approves application</li>
                  <li>3. Payment for employee training licenses</li>
                  <li>4. Receive unique access key for employees</li>
                </ol>
              </div>

              <form onSubmit={handleDispensaryApplication} className="space-y-4">
                <div>
                  <Input
                    placeholder="Dispensary/Organization Name *"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Contact Person *"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Contact Email *"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="Contact Phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Business Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Maryland Cannabis License Number"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Employee Training Licenses Needed
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={requestedCredits}
                    onChange={(e) => setRequestedCredits(parseInt(e.target.value) || 10)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Each license allows one employee to complete the training program ($49.99 per license)
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Submitting Application...' : 'Submit Application'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="login">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Existing Dispensary Managers</h3>
                </div>
                <p className="text-sm text-blue-700">
                  Use the login credentials provided after your dispensary setup was completed.
                </p>
              </div>

              <form onSubmit={handleDispensaryLogin} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In to Dispensary Portal'}
                </Button>
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot your password?
                  </Link>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispensaryAuthForm;