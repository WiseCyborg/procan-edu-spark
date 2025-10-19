import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight } from 'lucide-react';
import { Tier } from '@/hooks/useTierProgress';

interface TierUnlockCelebrationProps {
  tier: Tier;
  modulesCompleted: number;
  onClose: () => void;
}

const tierConfig = {
  green: {
    label: 'Green Tier',
    color: '#10b981',
    emoji: '🟢',
    message: 'Great start! You\'ve completed the foundational modules.'
  },
  yellow: {
    label: 'Yellow Tier',
    color: '#eab308',
    emoji: '🟡',
    message: 'Excellent progress! You\'re advancing to intermediate training.'
  },
  red: {
    label: 'Red Tier',
    color: '#ef4444',
    emoji: '🔴',
    message: 'Outstanding! You\'ve reached the advanced tier!'
  }
};

export const TierUnlockCelebration: React.FC<TierUnlockCelebrationProps> = ({
  tier,
  modulesCompleted,
  onClose
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const config = tierConfig[tier];

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          colors={[config.color, '#ffffff', '#fbbf24']}
        />
      )}
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center text-2xl">
              <Trophy className="w-8 h-8 mr-2" style={{ color: config.color }} />
              {config.label} Unlocked!
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-6">
            <div className="text-7xl animate-bounce">
              {config.emoji}
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">
                Congratulations!
              </p>
              <p className="text-muted-foreground">
                {config.message}
              </p>
              <p className="text-sm text-muted-foreground">
                You've mastered {modulesCompleted} modules
              </p>
            </div>
            <div className="w-full pt-4 border-t">
              <Button
                onClick={onClose}
                className="w-full"
                size="lg"
              >
                Continue Training
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
