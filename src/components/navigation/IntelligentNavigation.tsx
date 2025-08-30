import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  BookOpen, 
  Award, 
  BarChart3, 
  MessageSquare, 
  HelpCircle,
  Shield,
  Users,
  Settings,
  Home
} from 'lucide-react';
import { HoverCallout } from '@/components/ui/hover-callout';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
  description: string;
  isActive?: boolean;
}

export const IntelligentNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roles, isStudent, isDispensaryManager, isAdmin } = useUserRole();

  const navigationConfig: NavigationItem[] = [
    {
      id: 'home',
      label: 'Dashboard',
      path: '/',
      icon: Home,
      roles: ['student', 'dispensary_manager', 'admin'],
      description: 'Your personalized learning dashboard with progress tracking and course overview'
    },
    {
      id: 'course',
      label: 'Training',
      path: '/course',
      icon: BookOpen,
      roles: ['student', 'dispensary_manager', 'admin'],
      description: 'Access your MCA-compliant cannabis training modules and continue your learning journey'
    },
    {
      id: 'certificates',
      label: 'Certificates',
      path: '/certificates',
      icon: Award,
      roles: ['student', 'dispensary_manager', 'admin'],
      description: 'View and download your earned certificates, track completion status'
    },
    {
      id: 'dispensary-portal',
      label: 'Management Portal',
      path: '/dispensary-portal',
      icon: BarChart3,
      roles: ['dispensary_manager', 'admin'],
      description: 'Manage your team training, view compliance reports, and track employee progress'
    },
    {
      id: 'admin-dashboard',
      label: 'Admin Dashboard',
      path: '/enhanced-admin-dashboard',
      icon: Shield,
      roles: ['admin'],
      description: 'Enhanced system administration with intelligent features and AI-powered tools'
    },
    {
      id: 'faq',
      label: 'FAQ',
      path: '/faq',
      icon: HelpCircle,
      roles: ['student', 'dispensary_manager', 'admin'],
      description: 'Frequently asked questions and comprehensive help documentation'
    }
  ];

  const getVisibleItems = (): NavigationItem[] => {
    return navigationConfig.filter(item => 
      item.roles.some(role => roles.includes(role as any))
    ).map(item => ({
      ...item,
      isActive: location.pathname === item.path
    }));
  };

  const visibleItems = getVisibleItems();

  return (
    <nav className="flex items-center space-x-2">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <HoverCallout
            key={item.id}
            content={item.description}
            side="bottom"
          >
            <Button 
              onClick={() => navigate(item.path)}
              variant={item.isActive ? "default" : "ghost"}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{item.label}</span>
            </Button>
          </HoverCallout>
        );
      })}
    </nav>
  );
};