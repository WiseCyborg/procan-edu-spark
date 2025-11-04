import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
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
  requiresOrganization?: boolean;
}

export const IntelligentNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roles, isStudent, isDispensaryManager, isTrainingCoordinator, isAdmin } = useUserRole();
  const { organizationId } = useOrganization();
  const { flags } = useFeatureFlags();

  const navigationConfig: NavigationItem[] = [
    {
      id: 'home',
      label: 'Dashboard',
      path: '/',
      icon: Home,
      roles: ['student', 'dispensary_manager', 'training_coordinator', 'admin'],
      description: 'Your personalized learning dashboard with progress tracking and course overview'
    },
    {
      id: 'course',
      label: 'Training',
      path: '/course',
      icon: BookOpen,
      roles: ['student', 'dispensary_manager', 'training_coordinator', 'admin'],
      description: 'Access your MCA-compliant cannabis training modules and continue your learning journey'
    },
    {
      id: 'certificates',
      label: 'Certificates',
      path: '/certificates',
      icon: Award,
      roles: ['student', 'dispensary_manager', 'training_coordinator', 'admin'],
      description: 'View and download your earned certificates, track completion status'
    },
    {
      id: 'dispensary-portal',
      label: 'Team Management',
      path: '/team-management',
      icon: BarChart3,
      roles: ['dispensary_manager', 'training_coordinator', 'admin'],
      description: 'Manage your team training, view compliance reports, and track employee progress',
      requiresOrganization: true
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
      roles: ['student', 'dispensary_manager', 'training_coordinator', 'admin'],
      description: 'Frequently asked questions and comprehensive help documentation'
    }
  ];

  const getVisibleItems = (): NavigationItem[] => {
    return navigationConfig.filter(item => {
      const hasRequiredRole = item.roles.some(role => roles.includes(role as any));
      const meetsOrgRequirement = !flags.org_nav_guard || 
                                   !item.requiresOrganization || 
                                   !!organizationId;
      return hasRequiredRole && meetsOrgRequirement;
    }).map(item => ({
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