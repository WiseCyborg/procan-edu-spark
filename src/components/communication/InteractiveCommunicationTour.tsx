import { useState, useEffect } from 'react';
import { InteractiveWalkthrough, WalkthroughStep } from '@/components/help/InteractiveWalkthrough';

interface InteractiveCommunicationTourProps {
  onComplete: () => void;
  onSkip: () => void;
  activeConversationId: string | null;
  hasMessages: boolean;
}

export const InteractiveCommunicationTour = ({ 
  onComplete, 
  onSkip,
  activeConversationId,
  hasMessages
}: InteractiveCommunicationTourProps) => {
  const [initialConversationId] = useState(activeConversationId);
  const [initialHasMessages] = useState(hasMessages);

  const tourSteps: WalkthroughStep[] = [
    {
      id: 'channel-list',
      title: 'Your Team Channels',
      description: 'This is your channel list. Channels organize conversations by topic - announcements, training questions, or team discussions.',
      target: '[data-tour="channel-sidebar"]',
      position: 'right',
      type: 'highlight'
    },
    {
      id: 'select-channel',
      title: 'Select a Channel',
      description: 'Click on any channel to open it and see the conversation.',
      target: '[data-tour="channel-item"]',
      position: 'right',
      type: 'action',
      actionType: 'click',
      actionHint: 'Click on a channel in the sidebar to open it',
      validateAction: () => {
        // Check if a conversation was selected (different from initial)
        const currentConvId = document.querySelector('[data-active-conversation]')?.getAttribute('data-active-conversation');
        return !!currentConvId;
      }
    },
    {
      id: 'new-channel-button',
      title: 'Create New Channels',
      description: 'Click this button to create a new channel for your team. You can create channels for specific topics, projects, or groups.',
      target: '[data-tour="new-channel-button"]',
      position: 'bottom',
      type: 'highlight'
    },
    {
      id: 'message-input',
      title: 'Send a Message',
      description: 'Type your message here to communicate with your team. Try typing something!',
      target: '[data-tour="message-input"]',
      position: 'top',
      type: 'action',
      actionType: 'type',
      actionHint: 'Type a message in the input field',
      skippable: true
    },
    {
      id: 'file-attach',
      title: 'Share Files',
      description: 'Click this button to attach documents, images, or training materials (up to 10MB). Files are securely stored.',
      target: '[data-tour="file-attach-button"]',
      position: 'top',
      type: 'highlight'
    },
    {
      id: 'search',
      title: 'Search Conversations',
      description: 'Use the search bar to quickly find messages, channels, or team members across all your conversations.',
      target: '[data-tour="search-input"]',
      position: 'bottom',
      type: 'highlight'
    },
    {
      id: 'complete',
      title: 'You\'re Ready!',
      description: 'You now know the basics of Team Communication. Start chatting with your team, create channels for different topics, and share files when needed.',
      target: '[data-tour="channel-sidebar"]',
      position: 'right',
      type: 'highlight'
    }
  ];

  return (
    <InteractiveWalkthrough
      steps={tourSteps}
      onComplete={onComplete}
      onSkip={onSkip}
      walkthroughId="communication-hub"
    />
  );
};
