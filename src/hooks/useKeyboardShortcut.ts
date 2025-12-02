import { useEffect } from 'react';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/contexts/KeyboardShortcutsContext';

export const useKeyboardShortcut = (shortcut: Omit<KeyboardShortcut, 'disabled'>) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    registerShortcut(shortcut as KeyboardShortcut);

    return () => {
      unregisterShortcut(shortcut.key);
    };
  }, [shortcut.key, shortcut.action]);
};
