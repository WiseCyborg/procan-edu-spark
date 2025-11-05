import { CallerType } from './CallContextSelector';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Key, 
  Award, 
  UserPlus, 
  FileCheck, 
  Mail,
  Zap
} from 'lucide-react';

interface QuickActionsPanelProps {
  callerType: CallerType;
  onAction: (action: string) => void;
}

export const QuickActionsPanel = ({ callerType, onAction }: QuickActionsPanelProps) => {
  const getActions = () => {
    const baseActions = [
      { id: 'verify_email', label: 'Verify Email', icon: CheckCircle2 },
      { id: 'reset_password', label: 'Reset Password', icon: Key },
    ];

    switch (callerType) {
      case 'dispensary_manager':
        return [
          ...baseActions,
          { id: 'add_seat', label: 'Add Training Seat', icon: UserPlus },
          { id: 'view_org', label: 'View Organization', icon: FileCheck },
          { id: 'issue_cert', label: 'Issue Certificate', icon: Award },
        ];
      
      case 'training_coordinator':
        return [
          ...baseActions,
          { id: 'view_roster', label: 'View Roster', icon: FileCheck },
          { id: 'bulk_enroll', label: 'Bulk Enroll', icon: UserPlus },
          { id: 'send_reminder', label: 'Send Reminder', icon: Mail },
        ];
      
      case 'employee':
        return [
          ...baseActions,
          { id: 'check_progress', label: 'Check Progress', icon: FileCheck },
          { id: 'issue_cert', label: 'Issue Certificate', icon: Award },
          { id: 'resend_link', label: 'Resend Course Link', icon: Mail },
        ];
      
      case 'applicant':
        return [
          { id: 'check_status', label: 'Check Status', icon: FileCheck },
          { id: 'approve_app', label: 'Approve Application', icon: CheckCircle2 },
          { id: 'send_reg_link', label: 'Send Reg Link', icon: Mail },
        ];
      
      default:
        return baseActions;
    }
  };

  const actions = getActions();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Zap className="h-4 w-4" />
        Quick Actions
      </div>
      
      {!callerType && (
        <p className="text-xs text-muted-foreground">
          Select a caller type to see relevant quick actions
        </p>
      )}

      <div className="space-y-1">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onAction(action.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
