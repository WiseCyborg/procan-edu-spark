import { useEffect, useRef } from 'react';
import { useKeyboardShortcuts, KeyboardShortcut } from '@/contexts/KeyboardShortcutsContext';

export const useKeyboardShortcut = (shortcut: Omit<KeyboardShortcut, 'disabled'>) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
  
  // Use ref to store the latest action to avoid infinite loops from unstable function references
  const actionRef = useRef(shortcut.action);
  actionRef.current = shortcut.action;

  useEffect(() => {
    // Register with a stable wrapper that calls the current action ref
    const stableShortcut: KeyboardShortcut = {
      ...shortcut,
      action: () => actionRef.current(),
    };
    
    registerShortcut(stableShortcut);

    return () => {
      unregisterShortcut(shortcut.key);
    };
  }, [shortcut.key, shortcut.ctrlKey, shortcut.metaKey, shortcut.shiftKey, shortcut.altKey, shortcut.description, shortcut.category]);
};
