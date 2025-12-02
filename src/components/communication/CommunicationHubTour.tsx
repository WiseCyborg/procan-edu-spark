import { EnhancedFeatureTour } from '@/components/help/EnhancedFeatureTour';

interface CommunicationHubTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const CommunicationHubTour = ({ onComplete, onSkip }: CommunicationHubTourProps) => {
  const tourSteps = [
    {
      id: 'video-calls',
      title: 'Start Video Calls',
      description: 'Click here to start or join live video calls with your team. Perfect for training sessions, team meetings, or quick check-ins.',
      target: '[data-tour="video-call-button"]',
      position: 'bottom' as const
    },
    {
      id: 'schedule-calls',
      title: 'Schedule Future Calls',
      description: 'Plan ahead by scheduling recurring training sessions or team meetings. Set reminders and invite participants in advance.',
      target: '[data-tour="schedule-button"]',
      position: 'bottom' as const
    },
    {
      id: 'mentions',
      title: '@Mention Team Members',
      description: 'Type @ in any message to notify specific team members. They\'ll receive a notification and can respond quickly.',
      target: '[data-tour="message-input"]',
      position: 'top' as const
    },
    {
      id: 'file-sharing',
      title: 'Share Files',
      description: 'Click the attachment icon to share documents, images, or training materials up to 10MB. Files are securely stored and accessible anytime.',
      target: '[data-tour="file-attach-button"]',
      position: 'top' as const
    },
    {
      id: 'typing-indicators',
      title: 'Real-time Typing',
      description: 'See when team members are typing a response in real-time. No more wondering if your message was seen!',
      target: '[data-tour="typing-indicator"]',
      position: 'top' as const
    },
    {
      id: 'reactions',
      title: 'Quick Reactions',
      description: 'React to messages with emojis for quick feedback without typing a full response. Perfect for acknowledging messages during busy times.',
      target: '[data-tour="reaction-picker"]',
      position: 'left' as const
    }
  ];

  return (
    <EnhancedFeatureTour
      steps={tourSteps}
      onComplete={onComplete}
      onSkip={onSkip}
    />
  );
};
