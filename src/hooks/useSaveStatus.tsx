import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface SaveStatusContextType {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  markDirty: () => void;
  setSaving: () => void;
  setSaved: () => void;
  setError: () => void;
  setIdle: () => void;
  isSaving: boolean;
  hasUnsavedWork: boolean;
  flushSave: (timeoutMs?: number) => Promise<boolean>;
  registerSavePromise: (promise: Promise<unknown>) => void;
}

const SaveStatusContext = createContext<SaveStatusContextType | undefined>(undefined);

export const SaveStatusProvider = ({ children }: { children: ReactNode }) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const inFlightSaveRef = useRef<Promise<unknown> | null>(null);
  const resolveWaitersRef = useRef<Array<() => void>>([]);

  // Mark content as dirty (user has made changes that need saving)
  const markDirty = useCallback(() => {
    setSaveStatus((current) => {
      // Don't override saving status with dirty
      if (current === 'saving') return current;
      return 'dirty';
    });
  }, []);

  const setSaving = useCallback(() => {
    setSaveStatus('saving');
  }, []);

  const setSaved = useCallback(() => {
    setSaveStatus('saved');
    setLastSavedAt(new Date());
    
    // Notify any waiters that save completed
    resolveWaitersRef.current.forEach(resolve => resolve());
    resolveWaitersRef.current = [];
    inFlightSaveRef.current = null;
    
    // Auto-reset to idle after 3 seconds
    setTimeout(() => {
      setSaveStatus((current) => (current === 'saved' ? 'idle' : current));
    }, 3000);
  }, []);

  const setError = useCallback(() => {
    setSaveStatus('error');
    // Notify waiters even on error
    resolveWaitersRef.current.forEach(resolve => resolve());
    resolveWaitersRef.current = [];
    inFlightSaveRef.current = null;
  }, []);

  const setIdle = useCallback(() => {
    setSaveStatus('idle');
  }, []);

  // Register a save promise so we can wait for it
  const registerSavePromise = useCallback((promise: Promise<unknown>) => {
    inFlightSaveRef.current = promise;
  }, []);

  // Wait for any in-flight save to complete (with timeout)
  const flushSave = useCallback(async (timeoutMs: number = 5000): Promise<boolean> => {
    // If not currently saving, we're good
    if (saveStatus !== 'saving') {
      return true;
    }

    // If we have a registered promise, wait for it directly
    if (inFlightSaveRef.current) {
      try {
        await Promise.race([
          inFlightSaveRef.current,
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('save-timeout')), timeoutMs)
          ),
        ]);
        return true;
      } catch {
        return false;
      }
    }

    // Otherwise create a promise that resolves when save completes
    const waitPromise = new Promise<void>((resolve) => {
      resolveWaitersRef.current.push(resolve);
    });

    // Race against timeout
    try {
      await Promise.race([
        waitPromise,
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('save-timeout')), timeoutMs)
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  }, [saveStatus]);

  const isSaving = saveStatus === 'saving';
  // Has unsaved work if dirty, saving, or error (potential data loss)
  const hasUnsavedWork = saveStatus === 'dirty' || saveStatus === 'saving' || saveStatus === 'error';

  // Browser close protection - only when there's unsaved work
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork) {
        e.preventDefault();
        e.returnValue = 'Your progress is being saved. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedWork]);

  return (
    <SaveStatusContext.Provider
      value={{
        saveStatus,
        lastSavedAt,
        markDirty,
        setSaving,
        setSaved,
        setError,
        setIdle,
        isSaving,
        hasUnsavedWork,
        flushSave,
        registerSavePromise,
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
