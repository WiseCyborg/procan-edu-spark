import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNextAction, NextAction } from '@/hooks/useNextAction';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  AlertCircle, 
  CreditCard, 
  Settings, 
  Users, 
  BookOpen, 
  FileQuestion,
  Award,
  CheckCircle,
  Loader2,
  ArrowRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextActionBannerProps {
  className?: string;
  showDismiss?: boolean;
  variant?: 'full' | 'compact';
}

const iconMap = {
  alert: AlertCircle,
  payment: CreditCard,
  setup: Settings,
  users: Users,
  book: BookOpen,
  exam: FileQuestion,
  certificate: Award,
  check: CheckCircle,
};

const priorityStyles = {
  critical: 'bg-destructive/10 border-destructive/30 text-destructive',
  high: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-200',
  medium: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200',
  low: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-200',
};

const buttonStyles = {
  critical: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  high: 'bg-orange-600 hover:bg-orange-700 text-white',
  medium: 'bg-blue-600 hover:bg-blue-700 text-white',
  low: 'bg-green-600 hover:bg-green-700 text-white',
};

export const NextActionBanner: React.FC<NextActionBannerProps> = ({ 
  className, 
  showDismiss = false,
  variant = 'full'
}) => {
  const navigate = useNavigate();
  const { nextAction, isLoading } = useNextAction();
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  if (isLoading) {
    return (
      <Card className={cn('p-4 border bg-muted/50', className)}>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading your next step...</span>
        </div>
      </Card>
    );
  }

  // Don't show banner for completed states on low priority
  if (nextAction.action === 'all_complete' || nextAction.action === 'loading') {
    return null;
  }

  const Icon = iconMap[nextAction.icon] || CheckCircle;

  if (variant === 'compact') {
    return (
      <Card className={cn(
        'p-3 border-l-4 flex items-center justify-between gap-4',
        priorityStyles[nextAction.priority],
        className
      )}>
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">{nextAction.title}</p>
          </div>
        </div>
        <Button 
          size="sm"
          onClick={() => navigate(nextAction.route)}
          className={buttonStyles[nextAction.priority]}
        >
          {nextAction.buttonText}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'p-4 border-l-4 relative',
      priorityStyles[nextAction.priority],
      className
    )}>
      {showDismiss && (
        <button 
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-white/50 dark:bg-black/20">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base">{nextAction.title}</h3>
            <p className="text-sm opacity-90 mt-0.5">{nextAction.description}</p>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate(nextAction.route)}
          className={cn('flex-shrink-0', buttonStyles[nextAction.priority])}
        >
          {nextAction.buttonText}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

// Floating version for persistent guidance
export const NextActionFloating: React.FC = () => {
  const navigate = useNavigate();
  const { nextAction, isLoading } = useNextAction();
  const [minimized, setMinimized] = React.useState(false);

  if (isLoading || nextAction.priority === 'low') return null;

  const Icon = iconMap[nextAction.icon] || CheckCircle;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className={cn(
          'fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-105',
          nextAction.priority === 'critical' ? 'bg-destructive text-white' :
          nextAction.priority === 'high' ? 'bg-orange-600 text-white' :
          'bg-blue-600 text-white'
        )}
      >
        <Icon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 max-w-sm rounded-lg shadow-xl border p-4',
      priorityStyles[nextAction.priority]
    )}>
      <button 
        onClick={() => setMinimized(true)}
        className="absolute top-2 right-2 p-1 rounded hover:bg-black/10"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3 pr-6">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm">{nextAction.title}</p>
          <p className="text-xs opacity-80 mt-1">{nextAction.description}</p>
          <Button 
            size="sm"
            onClick={() => navigate(nextAction.route)}
            className={cn('mt-3', buttonStyles[nextAction.priority])}
          >
            {nextAction.buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NextActionBanner;
