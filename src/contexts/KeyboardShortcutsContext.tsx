import React, { createContext, useContext, useEffect, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'course' | 'communication' | 'global';
  disabled?: boolean;
}

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  isShortcutsDialogOpen: boolean;
  setShortcutsDialogOpen: (open: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isShortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  const registerShortcut = (shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => {
      const filtered = prev.filter((s) => s.key !== shortcut.key);
      return [...filtered, shortcut];
    });
  };

  const unregisterShortcut = (key: string) => {
    setShortcuts((prev) => prev.filter((s) => s.key !== key));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input/textarea
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;

      // Exception: Allow Ctrl/Cmd+K and Ctrl/Cmd+M even in input fields
      const isGlobalShortcut = (e.key === 'k' || e.key === 'm') && (e.ctrlKey || e.metaKey);
      const isHelpShortcut = e.key === '/' && (e.ctrlKey || e.metaKey);

      if (isInputField && !isGlobalShortcut && !isHelpShortcut) return;

      // Handle help shortcut
      if (isHelpShortcut) {
        e.preventDefault();
        setShortcutsDialogOpen(true);
        return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcuts.find((shortcut) => {
        if (shortcut.disabled) return false;
        
        const keyMatches = shortcut.key === e.key;
        const ctrlMatches = shortcut.ctrlKey === undefined || shortcut.ctrlKey === e.ctrlKey;
        const metaMatches = shortcut.metaKey === undefined || shortcut.metaKey === e.metaKey;
        const shiftMatches = shortcut.shiftKey === undefined || shortcut.shiftKey === e.shiftKey;
        const altMatches = shortcut.altKey === undefined || shortcut.altKey === e.altKey;

        return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
      });

      if (matchingShortcut) {
        e.preventDefault();
        matchingShortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        isShortcutsDialogOpen,
        setShortcutsDialogOpen
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
  }
  return context;
};
