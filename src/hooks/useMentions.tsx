import { useState, useCallback } from 'react';

interface Participant {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
}

export const useMentions = (participants: Participant[]) => {
  const [showPopover, setShowPopover] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  const handleInputChange = useCallback((
    text: string,
    inputElement: HTMLTextAreaElement | HTMLInputElement
  ) => {
    const cursorPos = inputElement.selectionStart || 0;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      // Just typed @
      const rect = inputElement.getBoundingClientRect();
      setCursorPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      });
      setMentionStartIndex(lastAtIndex);
      setSearchText('');
      setShowPopover(true);
    } else if (lastAtIndex !== -1 && cursorPos > lastAtIndex) {
      // Typing after @
      const searchTerm = textBeforeCursor.slice(lastAtIndex + 1);
      if (!searchTerm.includes(' ') && searchTerm.length < 30) {
        setSearchText(searchTerm);
        setShowPopover(true);
      } else {
        setShowPopover(false);
      }
    } else {
      setShowPopover(false);
    }
  }, []);

  const insertMention = useCallback((
    user: Participant,
    currentText: string,
    cursorPos: number
  ) => {
    if (mentionStartIndex === -1) return { newText: currentText, mentionedUserId: user.user_id };

    const mentionText = `@${user.first_name} ${user.last_name}`;
    const newText = 
      currentText.slice(0, mentionStartIndex) + 
      mentionText + ' ' +
      currentText.slice(cursorPos);
    
    setShowPopover(false);
    setMentionStartIndex(-1);
    
    return { 
      newText, 
      mentionedUserId: user.user_id,
      newCursorPos: mentionStartIndex + mentionText.length + 1
    };
  }, [mentionStartIndex]);

  const filteredParticipants = participants.filter(p =>
    searchText === '' || 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchText.toLowerCase())
  );

  return {
    showPopover,
    searchText,
    cursorPosition,
    filteredParticipants,
    handleInputChange,
    insertMention,
    closePopover: () => setShowPopover(false)
  };
};
