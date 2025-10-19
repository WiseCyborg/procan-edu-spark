import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const COMARBanner = () => {
  return (
    <Alert className="border-primary/20 bg-primary/5 mb-4">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm">
        Aligned to{' '}
        <a
          href="https://cannabis.maryland.gov/pages/responsible_vendor_training.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline hover:text-primary"
        >
          MCA Responsible Vendor Training
        </a>{' '}
        standards (COMAR 14.17). Last reviewed: January 2025
      </AlertDescription>
    </Alert>
  );
};
