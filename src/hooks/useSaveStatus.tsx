import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusContextType {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  setSaving: () => void;
  setSaved: () => void;
  setError: () => void;
  setIdle: () => void;
  isSaving: boolean;
  hasUnsavedWork: boolean;
}

const SaveStatusContext = createContext<SaveStatusContextType | undefined>(undefined);

export const SaveStatusProvider = ({ children }: { children: ReactNode }) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const setSaving = useCallback(() => {
    setSaveStatus('saving');
  }, []);

  const setSaved = useCallback(() => {
    setSaveStatus('saved');
    setLastSavedAt(new Date());
    // Auto-reset to idle after 3 seconds
    setTimeout(() => {
      setSaveStatus((current) => (current === 'saved' ? 'idle' : current));
    }, 3000);
  }, []);

  const setError = useCallback(() => {
    setSaveStatus('error');
  }, []);

  const setIdle = useCallback(() => {
    setSaveStatus('idle');
  }, []);

  const isSaving = saveStatus === 'saving';
  const hasUnsavedWork = saveStatus === 'saving';

  // Browser close protection - only when saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'Your progress is being saved. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  return (
    <SaveStatusContext.Provider
      value={{
        saveStatus,
        lastSavedAt,
        setSaving,
        setSaved,
        setError,
        setIdle,
        isSaving,
        hasUnsavedWork,
      }}
    >
      {children}
    </SaveStatusContext.Provider>
  );
};

export const useSaveStatus = () => {
  const context = useContext(SaveStatusContext);
  if (context === undefined) {
    throw new Error('useSaveStatus must be used within a SaveStatusProvider');
  }
  return context;
};

// Optional hook for components that may be outside provider
export const useSaveStatusOptional = () => {
  return useContext(SaveStatusContext);
};
