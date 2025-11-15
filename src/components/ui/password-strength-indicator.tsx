import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator = ({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    
    if (checks.length) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;
    
    let label = '';
    let color = '';
    
    if (score <= 20) {
      label = 'Very Weak';
      color = 'bg-destructive';
    } else if (score <= 40) {
      label = 'Weak';
      color = 'bg-orange-500';
    } else if (score <= 60) {
      label = 'Fair';
      color = 'bg-yellow-500';
    } else if (score <= 80) {
      label = 'Good';
      color = 'bg-blue-500';
    } else {
      label = 'Strong';
      color = 'bg-green-500';
    }
    
    return { score, label, color, checks };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Progress value={strength.score} className="h-2" />
        <span className="text-xs font-medium whitespace-nowrap">{strength.label}</span>
      </div>
      
      {showRequirements && (
        <div className="space-y-1 text-xs">
          <RequirementItem met={strength.checks.length} text="At least 8 characters" />
          <RequirementItem met={strength.checks.uppercase} text="One uppercase letter" />
          <RequirementItem met={strength.checks.lowercase} text="One lowercase letter" />
          <RequirementItem met={strength.checks.number} text="One number" />
          <RequirementItem met={strength.checks.special} text="One special character" />
        </div>
      )}
    </div>
  );
};

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className="flex items-center gap-1.5">
    {met ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
    ) : (
      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
    )}
    <span className={met ? 'text-green-600' : 'text-muted-foreground'}>{text}</span>
  </div>
);
