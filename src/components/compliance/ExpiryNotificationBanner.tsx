import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ExpiryNotificationBannerProps {
  organizationId: string;
}

interface ExpiringCertificate {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  certificate_number: string;
  expiry_date: string;
  days_until_expiry: number;
}

export const ExpiryNotificationBanner: React.FC<ExpiryNotificationBannerProps> = ({
  organizationId
}) => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const { data: expiringCerts, isLoading } = useQuery({
    queryKey: ['expiring-certificates', organizationId],
    queryFn: async () => {
      // Get certificates expiring in next 30 days
      const { data: certs, error } = await supabase
        .from('certificates')
        .select(`
          id,
          user_id,
          certificate_number,
          expiry_date,
          profiles!inner(first_name, last_name, organization_id)
        `)
        .eq('profiles.organization_id', organizationId)
        .eq('is_revoked', false)
        .gte('expiry_date', new Date().toISOString())
        .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      return (certs as any[])?.map(cert => ({
        id: cert.id,
        user_id: cert.user_id,
        first_name: cert.profiles.first_name,
        last_name: cert.profiles.last_name,
        certificate_number: cert.certificate_number,
        expiry_date: cert.expiry_date,
        days_until_expiry: Math.ceil(
          (new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      })) as ExpiringCertificate[];
    },
    enabled: !!organizationId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading || dismissed || !expiringCerts?.length) {
    return null;
  }

  const criticalCount = expiringCerts.filter(c => c.days_until_expiry <= 7).length;
  const warningCount = expiringCerts.filter(c => c.days_until_expiry > 7 && c.days_until_expiry <= 14).length;

  return (
    <Alert 
      className={`relative ${
        criticalCount > 0 
          ? 'border-destructive/50 bg-destructive/5' 
          : 'border-amber-500/50 bg-amber-500/5'
      }`}
    >
      <CalendarClock className={`h-5 w-5 ${criticalCount > 0 ? 'text-destructive' : 'text-amber-600'}`} />
      <AlertTitle className="flex items-center gap-2">
        Certificate Expiry Alert
        {criticalCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {criticalCount} urgent
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
            {warningCount} soon
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p className="text-sm">
            {expiringCerts.length} certificate{expiringCerts.length !== 1 ? 's' : ''} expiring in the next 30 days:
          </p>
          <ul className="space-y-1">
            {expiringCerts.slice(0, 3).map((cert) => (
              <li key={cert.id} className="text-sm flex items-center gap-2">
                <span className={`font-medium ${cert.days_until_expiry <= 7 ? 'text-destructive' : ''}`}>
                  {cert.first_name} {cert.last_name}
                </span>
                <span className="text-muted-foreground">—</span>
                <span className={cert.days_until_expiry <= 7 ? 'text-destructive font-medium' : 'text-amber-600'}>
                  {cert.days_until_expiry} day{cert.days_until_expiry !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
            {expiringCerts.length > 3 && (
              <li className="text-sm text-muted-foreground">
                +{expiringCerts.length - 3} more...
              </li>
            )}
          </ul>
          <Button 
            variant="link" 
            className="p-0 h-auto text-sm"
            onClick={() => navigate('/compliance')}
          >
            View all expiring certificates
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};
