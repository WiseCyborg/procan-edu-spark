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
  HelpCircle,
  Shield,
  Users,
  Home,
  GraduationCap,
  FileText
} from 'lucide-react';
import { HoverCallout } from '@/components/ui/hover-callout';

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  description: string;
  isActive?: boolean;
}

type RoleType = 'student' | 'manager' | 'admin' | 'public';

// Role-specific navigation configurations
const getNavigationByRole = (role: RoleType): NavigationItem[] => {
  switch (role) {
    case 'admin':
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          path: '/dashboard',
          icon: Home,
          description: 'System overview and key metrics'
        },
        {
          id: 'team',
          label: 'Team',
          path: '/team-management',
          icon: Users,
          description: 'Manage team members and compliance'
        },
        {
          id: 'training',
          label: 'Training',
          path: '/course',
          icon: BookOpen,
          description: 'Access training modules'
        },
        {
          id: 'certificates',
          label: 'Certificates',
          path: '/certificates',
          icon: Award,
          description: 'View and verify certificates'
        },
        {
          id: 'admin',
          label: 'Admin',
          path: '/enhanced-admin-dashboard',
          icon: Shield,
          description: 'System administration'
        }
      ];
      
    case 'manager':
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          path: '/dashboard',
          icon: Home,
          description: 'Your personalized dashboard'
        },
        {
          id: 'learners',
          label: 'Learners',
          path: '/team-management',
          icon: Users,
          description: 'View and manage learner progress'
        },
        {
          id: 'training',
          label: 'Training',
          path: '/course',
          icon: BookOpen,
          description: 'Access training modules'
        },
        {
          id: 'reports',
          label: 'Reports',
          path: '/dispensary-manager-dashboard',
          icon: BarChart3,
          description: 'Compliance reports and analytics'
        },
        {
          id: 'certificates',
          label: 'Certificates',
          path: '/certificates',
          icon: Award,
          description: 'View and download certificates'
        }
      ];
      
    case 'student':
      return [
        {
          id: 'training',
          label: 'My Training',
          path: '/course',
          icon: BookOpen,
          description: 'Continue your RVT training'
        },
        {
          id: 'certificates',
          label: 'My Certificates',
          path: '/certificates',
          icon: Award,
          description: 'View your earned certificates'
        },
        {
          id: 'help',
          label: 'Help',
          path: '/faq',
          icon: HelpCircle,
          description: 'Get help and answers'
        }
      ];
      
    case 'public':
    default:
      return [
        {
          id: 'learn',
          label: 'Learn',
          path: '/consumer-education',
          icon: GraduationCap,
          description: 'Free cannabis education'
        },
        {
          id: 'faq',
          label: 'FAQ',
          path: '/faq',
          icon: HelpCircle,
          description: 'Frequently asked questions'
        }
      ];
  }
};

export const IntelligentNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isStudent, isDispensaryManager, isTrainingCoordinator, isAdmin } = useUserRole();
  const { organizationId } = useOrganization();
  const { flags } = useFeatureFlags();

  // Determine primary role
  const getPrimaryRole = (): RoleType => {
    if (isAdmin) return 'admin';
    if (isDispensaryManager || isTrainingCoordinator) return 'manager';
    if (isStudent) return 'student';
    return 'public';
  };

  const role = getPrimaryRole();
  const navigationItems = getNavigationByRole(role);

  // Add active state based on current path
  const itemsWithActiveState = navigationItems.map(item => ({
    ...item,
    isActive: location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path))
  }));

  return (
    <nav className="flex items-center space-x-1">
      {itemsWithActiveState.map((item) => {
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