import React, { createContext, useContext, ReactNode } from 'react';
import { useCOMARVersion, COMARVersionData } from '@/hooks/useCOMARVersion';

interface COMARVersionContextType {
  data: COMARVersionData | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  formattedDate: string;
  isStale: boolean;
}

const COMARVersionContext = createContext<COMARVersionContextType | undefined>(undefined);

export const COMARVersionProvider = ({ children }: { children: ReactNode }) => {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useCOMARVersion();

  // Check if data is stale (older than 24 hours)
  const isStale = dataUpdatedAt ? Date.now() - dataUpdatedAt > 24 * 60 * 60 * 1000 : false;

  const formattedDate = data?.effectiveDate
    ? new Date(data.effectiveDate).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
    : 'Unknown';

  return (
    <COMARVersionContext.Provider
      value={{
        data,
        isLoading,
        error: error as Error | null,
        refetch,
        formattedDate,
        isStale
      }}
    >
      {children}
    </COMARVersionContext.Provider>
  );
};

export const useCOMARVersionContext = () => {
  const context = useContext(COMARVersionContext);
  if (context === undefined) {
    throw new Error('useCOMARVersionContext must be used within a COMARVersionProvider');
  }
  return context;
};
