import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface OrgMember {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

interface NewDirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartDirectMessage: (otherUserId: string) => Promise<string | null>;
}

export const NewDirectMessageDialog = ({
  open,
  onOpenChange,
  onStartDirectMessage,
}: NewDirectMessageDialogProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();
        if (!myProfile?.organization_id) {
          setMembers([]);
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .eq('organization_id', myProfile.organization_id)
          .neq('user_id', user.id);
        if (error) throw error;
        if (!cancelled) setMembers(data || []);
      } catch (err) {
        console.error('Error loading org members:', err);
        toast.error('Failed to load team members');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  const filtered = members.filter(m => {
    const name = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const handleStart = async (otherUserId: string) => {
    setStarting(otherUserId);
    try {
      const id = await onStartDirectMessage(otherUserId);
      if (id) {
        onOpenChange(false);
        setSearch('');
      }
    } finally {
      setStarting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            New Direct Message
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search teammates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading team...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                {members.length === 0
                  ? 'No teammates found in your organization.'
                  : 'No matches.'}
              </div>
            ) : (
              filtered.map(m => {
                const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unnamed';
                return (
                  <button
                    key={m.user_id}
                    onClick={() => handleStart(m.user_id)}
                    disabled={starting === m.user_id}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent text-left text-sm disabled:opacity-50"
                  >
                    <span>{name}</span>
                    {starting === m.user_id && (
                      <span className="text-xs text-muted-foreground">Starting...</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
