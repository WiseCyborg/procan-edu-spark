import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Award, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const navItems = [
    { path: '/student-dashboard', icon: Home, label: 'Dashboard' },
    { path: '/course', icon: BookOpen, label: 'Course' },
    { path: '/certificates', icon: Award, label: 'Certs' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg md:hidden">
      <div className="flex justify-around items-center p-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={`flex-1 flex-col h-auto py-2 ${
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
