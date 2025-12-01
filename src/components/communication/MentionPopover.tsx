import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

interface Participant {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
}

interface MentionPopoverProps {
  participants: Participant[];
  position: { top: number; left: number };
  onSelect: (user: Participant) => void;
  onClose: () => void;
}

export const MentionPopover = ({
  participants,
  position,
  onSelect,
  onClose
}: MentionPopoverProps) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  if (participants.length === 0) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-2 w-64 max-h-64 overflow-y-auto"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {participants.map(user => (
        <Button
          key={user.user_id}
          variant="ghost"
          className="w-full justify-start hover:bg-accent"
          onClick={() => onSelect(user)}
        >
          <Avatar className="h-6 w-6 mr-2">
            {user.profile_photo_url && (
              <AvatarImage src={user.profile_photo_url} alt={`${user.first_name} ${user.last_name}`} />
            )}
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(user.first_name, user.last_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{user.first_name} {user.last_name}</span>
        </Button>
      ))}
    </div>
  );
};
