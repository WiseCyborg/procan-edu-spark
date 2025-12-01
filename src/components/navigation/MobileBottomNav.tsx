import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Award, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';

interface MobileBottomNavProps {
  onMessagesClick?: () => void;
}

export const MobileBottomNav = ({ onMessagesClick }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isStudent, isDispensaryManager, isTrainingCoordinator } = useUserRole();

  if (!isMobile) return null;

  // Role-aware navigation items
  const navItems = [
    { path: '/', icon: Home, label: 'Home', roles: ['all'] },
    { path: '/course', icon: BookOpen, label: 'Training', roles: ['all'] },
    { 
      action: 'messages', 
      icon: MessageSquare, 
      label: 'Messages', 
      roles: ['all'],
      onClick: onMessagesClick 
    },
    { path: '/certificates', icon: Award, label: 'Certs', roles: ['all'] },
    { path: '/profile', icon: User, label: 'Profile', roles: ['all'] },
  ];

  const isActive = (path?: string) => path && location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg md:hidden">
      <div className="flex justify-around items-center p-2">
        {navItems.map((item, index) => (
          <Button
            key={item.path || item.action || index}
            variant="ghost"
            size="sm"
            onClick={() => {
              if (item.onClick) {
                item.onClick();
              } else if (item.path) {
                navigate(item.path);
              }
            }}
            className={`flex-1 flex-col h-auto py-3 min-h-[60px] ${
              isActive(item.path) ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <item.icon className={`h-5 w-5 mb-1 ${isActive(item.path) ? 'text-primary' : ''}`} />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
