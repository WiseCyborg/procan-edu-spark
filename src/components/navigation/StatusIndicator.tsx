import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'healthy' | 'warning' | 'error' | 'info';
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusIndicator = ({ 
  status, 
  pulse = false, 
  size = 'md',
  className 
}: StatusIndicatorProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const statusClasses = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <span 
        className={cn(
          "rounded-full",
          sizeClasses[size],
          statusClasses[status],
          pulse && "animate-pulse"
        )}
      />
      {pulse && (
        <span 
          className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-75",
            sizeClasses[size],
            statusClasses[status]
          )}
        />
      )}
    </div>
  );
};
