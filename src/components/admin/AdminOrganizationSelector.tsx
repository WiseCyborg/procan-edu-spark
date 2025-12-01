import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  total_seats: number;
  available_seats: number;
  assigned_seats: number;
  used_seats: number;
}

interface AdminOrganizationSelectorProps {
  onSelect: (organizationId: string) => void;
  selectedOrgId?: string;
}

export const AdminOrganizationSelector = ({ onSelect, selectedOrgId }: AdminOrganizationSelectorProps) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // Fetch organizations
      // @ts-ignore - Suppressing deep type instantiation error from Supabase
      const orgsResult = await supabase
        .from('organizations')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (orgsResult.error) throw orgsResult.error;

      const orgs = orgsResult.data || [];

      if (orgs.length === 0) {
        setOrganizations([]);
        return;
      }

      // Fetch seat counts for each organization
      const orgsWithSeats: Organization[] = [];
      
      for (const org of orgs) {
        // @ts-ignore - Suppressing deep type instantiation error from Supabase
        const seatsResult = await supabase
          .from('rvt_seats')
          .select('status')
          .eq('organization_id', org.id);

        const seatData = seatsResult.data || [];
        orgsWithSeats.push({
          id: org.id,
          name: org.name,
          total_seats: seatData.length,
          available_seats: seatData.filter((s: any) => s.status === 'available').length,
          assigned_seats: seatData.filter((s: any) => s.status === 'assigned').length,
          used_seats: seatData.filter((s: any) => s.status === 'used').length,
        });
      }

      setOrganizations(orgsWithSeats);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  const getUtilizationColor = (org: Organization) => {
    if (org.total_seats === 0) return 'text-muted-foreground';
    const utilizationRate = ((org.assigned_seats + org.used_seats) / org.total_seats) * 100;
    if (utilizationRate >= 80) return 'text-green-600';
    if (utilizationRate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Select Organization
        </CardTitle>
        <CardDescription>Choose an organization to manage its training seats</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedOrgId} onValueChange={onSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select an organization..." />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                <div className="flex items-center justify-between w-full gap-4">
                  <span>{org.name}</span>
                  <span className={`text-xs font-medium ${getUtilizationColor(org)}`}>
                    {org.assigned_seats + org.used_seats}/{org.total_seats} seats
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedOrg && (
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{selectedOrg.total_seats}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{selectedOrg.available_seats}</div>
              <div className="text-xs text-green-600 dark:text-green-500">Available</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{selectedOrg.assigned_seats}</div>
              <div className="text-xs text-blue-600 dark:text-blue-500">Assigned</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{selectedOrg.used_seats}</div>
              <div className="text-xs text-purple-600 dark:text-purple-500">In Use</div>
            </div>
          </div>
        )}

        {organizations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No active organizations found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
