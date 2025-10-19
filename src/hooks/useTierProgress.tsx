import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type Tier = 'green' | 'yellow' | 'red';

interface TierAchievement {
  tier: Tier;
  unlocked_at: string;
  modules_completed: number;
}

export const useTierProgress = () => {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<Tier>('green');
  const [tierAchievements, setTierAchievements] = useState<TierAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCurrentTier('green');
      setTierAchievements([]);
      setIsLoading(false);
      return;
    }

    fetchTierProgress();
  }, [user]);

  const fetchTierProgress = async () => {
    try {
      // Get current tier from RPC
      const { data: tierData } = await supabase.rpc('get_user_tier', {
        _user_id: user!.id
      });

      if (tierData) {
        setCurrentTier(tierData as Tier);
      }

      // Get tier achievements
      const { data: achievements } = await supabase
        .from('tier_achievements')
        .select('*')
        .eq('user_id', user!.id)
        .order('unlocked_at', { ascending: false });

      if (achievements) {
        setTierAchievements(achievements.map(a => ({
          tier: a.tier as Tier,
          unlocked_at: a.unlocked_at,
          modules_completed: a.modules_completed
        })));
      }
    } catch (error) {
      console.error('Error fetching tier progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canAccessModule = (moduleNumber: number): boolean => {
    if (currentTier === 'green') return moduleNumber <= 6;
    if (currentTier === 'yellow') return moduleNumber <= 12;
    return moduleNumber <= 18; // red tier
  };

  const getNextTier = (): Tier | null => {
    if (currentTier === 'green') return 'yellow';
    if (currentTier === 'yellow') return 'red';
    return null;
  };

  const getModulesNeededForNextTier = (): number | null => {
    if (currentTier === 'green') return 6;
    if (currentTier === 'yellow') return 12;
    return null;
  };

  const checkAndUnlockTier = async (completedModules: number) => {
    const nextTier = getNextTier();
    const modulesNeeded = getModulesNeededForNextTier();

    if (!nextTier || !modulesNeeded || completedModules < modulesNeeded) {
      return false;
    }

    // Check if already unlocked
    const alreadyUnlocked = tierAchievements.some(
      achievement => achievement.tier === nextTier
    );

    if (alreadyUnlocked) {
      return false;
    }

    try {
      // Unlock via RPC
      const { data, error } = await supabase.rpc('unlock_tier', {
        _user_id: user!.id,
        _tier: nextTier,
        _modules_completed: completedModules
      });

      if (error) throw error;

      if (data) {
        // Refresh tier data
        await fetchTierProgress();
        return true;
      }
    } catch (error) {
      console.error('Error unlocking tier:', error);
      toast({
        title: 'Error',
        description: 'Failed to unlock new tier. Please try again.',
        variant: 'destructive'
      });
    }

    return false;
  };

  return {
    currentTier,
    tierAchievements,
    isLoading,
    canAccessModule,
    getNextTier,
    getModulesNeededForNextTier,
    checkAndUnlockTier,
    refetchTierProgress: fetchTierProgress
  };
};
