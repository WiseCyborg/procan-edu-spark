import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  label?: string;
}

const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-8 w-8',
  large: 'h-12 w-12'
};

export const LoadingSpinner = ({ 
  size = 'medium', 
  className,
  label 
}: LoadingSpinnerProps) => {
  return (
    <div 
      className="inline-flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <Loader2 
        className={cn(
          'animate-spin text-primary',
          sizeClasses[size],
          className
        )} 
      />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
};
