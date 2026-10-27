import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { McaIndependenceNotice } from '@/components/layout/McaIndependenceNotice';

export const COMARBanner = () => {
  return (
    <Alert className="border-primary/20 bg-primary/5 mb-4">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm">
        <McaIndependenceNotice linkClassName="font-semibold underline hover:text-primary" />
      </AlertDescription>
    </Alert>
  );
};
