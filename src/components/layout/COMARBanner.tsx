import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useLastComarReview } from '@/hooks/useLastComarReview';

const formatMonthYear = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d);

export const COMARBanner = () => {
  const { lastReviewed } = useLastComarReview();
  const reviewed = lastReviewed ? formatMonthYear(lastReviewed) : 'January 2025';

  return (
    <Alert className="border-primary/20 bg-primary/5 mb-4">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm">
        Maryland cannabis workforce education. ProCann Edu is an independent training provider and is
        not on the MCA approved Responsible Vendor Training list (
        <a
          href="https://cannabis.maryland.gov/pages/responsible_vendor_training.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline hover:text-primary"
        >
          see MCA's approved list
        </a>
        ). This course does not satisfy Maryland's annual responsible vendor / agent training duty.
        Last reviewed: {reviewed}
      </AlertDescription>
    </Alert>
  );
};
