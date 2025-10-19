import React from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useLocation, Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const pathNameMap: Record<string, string> = {
  'dashboard': 'Dashboard',
  'student-dashboard': 'Student Dashboard',
  'course': 'Course',
  'profile': 'Profile',
  'team-management': 'Team Management',
  'admin': 'Admin',
  'purchase-seats': 'Purchase Seats',
  'final-exam': 'Final Exam',
  'certificates': 'Certificates',
  'dispensary-portal': 'Dispensary Portal',
  'training-coordinator-dashboard': 'Training Coordinator',
  'dispensary-manager-dashboard': 'Manager Dashboard',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) return null; // Don't show on home page
  
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {pathSegments.map((segment, index) => {
          const path = '/' + pathSegments.slice(0, index + 1).join('/');
          const isLast = index === pathSegments.length - 1;
          
          // Check if it's a module number (e.g., "1", "2", "18")
          const isModuleNumber = /^\d+$/.test(segment) && pathSegments[index - 1] === 'course';
          const label = isModuleNumber 
            ? `Module ${segment}`
            : pathNameMap[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          return (
            <React.Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}