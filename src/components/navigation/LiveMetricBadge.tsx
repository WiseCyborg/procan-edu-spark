import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { animateValue } from "@/utils/animationHelpers";

interface LiveMetricBadgeProps {
  value: number | string;
  icon?: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  animated?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const LiveMetricBadge = ({ 
  value, 
  icon, 
  variant = 'secondary',
  animated = false,
  trend,
  className 
}: LiveMetricBadgeProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (animated && typeof value === 'number' && typeof displayValue === 'number') {
      if (value !== displayValue) {
        setIsAnimating(true);
        animateValue(displayValue, value, 500, (current) => {
          setDisplayValue(current);
        });
        setTimeout(() => setIsAnimating(false), 500);
      }
    } else {
      setDisplayValue(value);
    }
  }, [value, animated, displayValue]);

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;

  return (
    <Badge 
      variant={variant}
      className={cn(
        "gap-1 animate-in fade-in-0 zoom-in-95 duration-200",
        isAnimating && "scale-110 transition-transform duration-200",
        className
      )}
    >
      {icon}
      <span className="font-bold">{displayValue}</span>
      {trendIcon && (
        <span className={cn(
          "text-xs",
          trend === 'up' && "text-green-600",
          trend === 'down' && "text-red-600"
        )}>
          {trendIcon}
        </span>
      )}
    </Badge>
  );
};
