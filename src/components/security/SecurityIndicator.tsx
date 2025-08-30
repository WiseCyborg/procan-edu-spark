import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Smartphone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurityIndicatorProps {
  requiresReauth?: boolean;
  urgency?: 'low' | 'medium' | 'high';
  method?: 'email' | 'sms' | 'any';
  className?: string;
}

export const SecurityIndicator: React.FC<SecurityIndicatorProps> = ({
  requiresReauth = false,
  urgency = 'medium',
  method = 'any',
  className
}) => {
  if (!requiresReauth) return null;

  const getUrgencyColor = () => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getIcon = () => {
    if (method === 'sms') return <Smartphone className="h-3 w-3" />;
    if (method === 'email') return <Mail className="h-3 w-3" />;
    return <Shield className="h-3 w-3" />;
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-xs gap-1',
        getUrgencyColor(),
        className
      )}
    >
      {getIcon()}
      <Lock className="h-2 w-2" />
      Secure
    </Badge>
  );
};