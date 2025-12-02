import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useKeyboardShortcuts } from '@/contexts/KeyboardShortcutsContext';
import { Keyboard } from 'lucide-react';

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

const formatShortcut = (shortcut: any) => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push(isMac ? '⌥' : 'Alt');
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
};

export const KeyboardShortcutsDialog = () => {
  const { isShortcutsDialogOpen, setShortcutsDialogOpen, shortcuts } = useKeyboardShortcuts();

  const categorizedShortcuts = {
    global: shortcuts.filter((s) => s.category === 'global'),
    navigation: shortcuts.filter((s) => s.category === 'navigation'),
    communication: shortcuts.filter((s) => s.category === 'communication'),
    course: shortcuts.filter((s) => s.category === 'course')
  };

  return (
    <Dialog open={isShortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(categorizedShortcuts).map(([category, categoryShortcuts]) => {
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-3 py-1.5 text-xs font-semibold bg-muted rounded border border-border">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {shortcuts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No keyboard shortcuts registered yet
            </p>
          )}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border">
              {isMac ? '⌘' : 'Ctrl'} + /
            </kbd> anytime to view shortcuts
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
