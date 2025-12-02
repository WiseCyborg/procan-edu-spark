import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, AtSign, Paperclip, Calendar, MessageSquare, CheckCircle2, PlayCircle } from 'lucide-react';

const ONBOARDING_STORAGE_KEY = 'communication-hub-onboarding-seen';

interface CommunicationHubOnboardingProps {
  onStartTour: () => void;
}

export const CommunicationHubOnboarding = ({ onStartTour }: CommunicationHubOnboardingProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setOpen(false);
  };

  const handleStartTour = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setOpen(false);
    onStartTour();
  };

  const features = [
    {
      icon: Video,
      title: 'Video Calls',
      description: 'Start or join live video calls with your team members',
    },
    {
      icon: Calendar,
      title: 'Schedule Calls',
      description: 'Plan ahead by scheduling recurring training sessions',
    },
    {
      icon: AtSign,
      title: '@Mentions',
      description: 'Type @ to mention and notify specific team members',
    },
    {
      icon: Paperclip,
      title: 'File Sharing',
      description: 'Share documents, images, and files up to 10MB',
    },
    {
      icon: MessageSquare,
      title: 'Real-time Chat',
      description: 'See who\'s typing and get instant message delivery',
    },
    {
      icon: CheckCircle2,
      title: 'Reactions',
      description: 'React to messages with emojis for quick feedback',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Team Communication!</DialogTitle>
          <DialogDescription className="text-base">
            Your hub for training coordination, team discussions, and real-time collaboration
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-3 p-4 rounded-lg border bg-card/50">
              <feature.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Getting Started
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Select a channel from the sidebar to start messaging</li>
            <li>• Use the search bar to find conversations quickly</li>
            <li>• Click "New Channel" to create your own discussion space</li>
            <li>• Push notifications keep you updated even when away</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleClose} variant="outline">
            Got it, let's go!
          </Button>
          <Button onClick={handleStartTour} className="gap-2">
            <PlayCircle className="w-4 h-4" />
            Take the Tour
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
