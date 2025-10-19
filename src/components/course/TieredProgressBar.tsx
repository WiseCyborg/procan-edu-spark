import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Flame } from 'lucide-react';
import { Tier } from '@/hooks/useTierProgress';

interface TieredProgressBarProps {
  completedModules: number;
  totalModules: number;
  currentTier?: Tier;
}

export const TieredProgressBar: React.FC<TieredProgressBarProps> = ({
  completedModules,
  totalModules,
  currentTier = 'green'
}) => {
  const progressPercentage = (completedModules / totalModules) * 100;
  
  const getTierConfig = (tier: Tier) => {
    const configs = {
      green: { name: 'Green Tier', color: 'bg-stoplight-green', icon: Target },
      yellow: { name: 'Yellow Tier', color: 'bg-stoplight-yellow', icon: Flame },
      red: { name: 'Red Tier', color: 'bg-stoplight-red', icon: Trophy }
    };
    return configs[tier];
  };

  const tierConfig = getTierConfig(currentTier);
  const TierIcon = tierConfig.icon;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
      <div className="flex items-center space-x-2">
          <TierIcon className={`w-6 h-6 text-white ${tierConfig.color} rounded-full p-1`} />
          <Badge className={`${tierConfig.color} text-white`}>
            {tierConfig.name}
          </Badge>
        </div>
        <span className="text-sm font-semibold text-gray-600">
          {completedModules} / {totalModules} Modules
        </span>
      </div>
      
      <Progress value={progressPercentage} className="h-3" />
      
      {/* Tier Milestones */}
      <div className="flex justify-between text-xs text-gray-500">
        <span className={completedModules >= 6 ? 'text-stoplight-green font-semibold' : ''}>
          Green (1-6)
        </span>
        <span className={completedModules >= 12 ? 'text-stoplight-yellow font-semibold' : ''}>
          Yellow (7-12)
        </span>
        <span className={completedModules >= 18 ? 'text-stoplight-red font-semibold' : ''}>
          Red (13-18)
        </span>
      </div>
    </div>
  );
};