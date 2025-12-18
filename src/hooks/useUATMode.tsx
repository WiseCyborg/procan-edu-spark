import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UATAccount {
  id: string;
  user_id: string;
  account_type: string;
  email: string;
  organization_id: string | null;
  notes: string | null;
  is_active: boolean;
}

interface UATPageGuidance {
  route: string;
  title: string;
  testingTips: string[];
  expectedBehaviors: string[];
  knownIssues?: string[];
  bugReportPrompts: string[];
}

const UAT_PAGE_GUIDANCE: Record<string, UATPageGuidance> = {
  '/': {
    route: 'home',
    title: 'Landing Page Testing',
    testingTips: [
      'Verify all CTA buttons navigate correctly',
      'Check responsive layout on mobile/tablet',
      'Test "Start Learning" button navigation',
      'Verify pricing displays correctly'
    ],
    expectedBehaviors: [
      'Hero section loads with animation',
      'Navigation menu works on all screen sizes',
      'Course preview shows accurate module count (23)',
      'Footer links are functional'
    ],
    bugReportPrompts: [
      'Button not responding to clicks',
      'Layout broken on mobile',
      'Missing or incorrect content',
      'Navigation not working'
    ]
  },
  '/auth': {
    route: 'auth',
    title: 'Authentication Testing',
    testingTips: [
      'Test login with valid credentials',
      'Test login with invalid credentials',
      'Test password reset flow',
      'Test join code entry for employees'
    ],
    expectedBehaviors: [
      'Login redirects to dashboard on success',
      'Error message shows for invalid credentials',
      'Password reset sends email',
      'Join code validates and shows organization name'
    ],
    knownIssues: [
      'Password reset requires Supabase Auth SMTP configuration'
    ],
    bugReportPrompts: [
      'Cannot log in with valid credentials',
      'Error message unclear or missing',
      'Password reset not sending email',
      'Join code not validating'
    ]
  },
  '/dashboard': {
    route: 'dashboard',
    title: 'Dashboard Testing',
    testingTips: [
      'Verify role-appropriate content displays',
      'Check progress tracking accuracy',
      'Test certificate download (if earned)',
      'Verify navigation to training modules'
    ],
    expectedBehaviors: [
      'Dashboard shows correct user role badge',
      'Progress percentage matches completed modules',
      'Resume prompt appears for incomplete training',
      'Quick actions work correctly'
    ],
    bugReportPrompts: [
      'Wrong role displayed',
      'Progress not updating',
      'Certificate download failing',
      'Missing dashboard sections'
    ]
  },
  '/course': {
    route: 'course',
    title: 'Course Navigation Testing',
    testingTips: [
      'Verify module list shows all 23 modules',
      'Test module locking (prerequisites)',
      'Check "Mark as Complete" functionality',
      'Test progress persistence across sessions'
    ],
    expectedBehaviors: [
      'Modules unlock sequentially after completion',
      'Progress saves to database on completion',
      'Sidebar shows completion status',
      'Quiz results display correctly'
    ],
    knownIssues: [
      'Module 0 completion must persist to unlock Module 1'
    ],
    bugReportPrompts: [
      'Module not unlocking after completion',
      'Progress not saving',
      'Quiz not loading',
      'Content not displaying'
    ]
  },
  '/course/final-exam': {
    route: 'final-exam',
    title: 'Final Exam Testing',
    testingTips: [
      'Verify all questions load',
      'Test timer functionality',
      'Check score calculation',
      'Test certificate generation on pass (80%+)'
    ],
    expectedBehaviors: [
      'Exam locks chat assistance',
      'Timer counts down correctly',
      'Score displays after submission',
      'Certificate generates automatically on pass'
    ],
    bugReportPrompts: [
      'Questions not loading',
      'Timer not working',
      'Score calculation incorrect',
      'Certificate not generating after pass'
    ]
  },
  '/manager-dashboard': {
    route: 'manager-dashboard',
    title: 'Manager Dashboard Testing',
    testingTips: [
      'Test employee invitation flow',
      'Verify seat management tools',
      'Check team progress overview',
      'Test compliance report generation'
    ],
    expectedBehaviors: [
      'Shows all employees in organization',
      'Seat allocation displays correctly',
      'Can send employee invitations',
      'Progress charts are accurate'
    ],
    bugReportPrompts: [
      'Cannot invite employees',
      'Seat count incorrect',
      'Team progress not showing',
      'Cannot generate reports'
    ]
  },
  '/admin-management': {
    route: 'admin',
    title: 'Admin Panel Testing',
    testingTips: [
      'Test organization approval workflow',
      'Verify system health monitoring',
      'Check UAT account management',
      'Test email system status'
    ],
    expectedBehaviors: [
      'Can approve/reject applications',
      'System health shows real status',
      'Can create/reset UAT accounts',
      'Email logs display correctly'
    ],
    bugReportPrompts: [
      'Cannot approve applications',
      'System health not loading',
      'UAT account creation failing',
      'Admin actions not working'
    ]
  }
};

export const useUATMode = () => {
  const { user } = useAuth();
  const [isUATUser, setIsUATUser] = useState(false);
  const [uatAccount, setUatAccount] = useState<UATAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUATStatus = async () => {
      if (!user?.email) {
        setIsUATUser(false);
        setUatAccount(null);
        setIsLoading(false);
        return;
      }

      // Check if user email matches UAT pattern
      const isUATEmail = user.email.toLowerCase().startsWith('uat-') || 
                         user.email.toLowerCase().includes('@test.com');

      if (isUATEmail) {
        // Try to fetch UAT account details
        try {
          const { data, error } = await supabase
            .from('uat_accounts')
            .select('*')
            .eq('email', user.email.toLowerCase())
            .eq('is_active', true)
            .single();

          if (data && !error) {
            setUatAccount(data as UATAccount);
            setIsUATUser(true);
          } else {
            // Still mark as UAT user based on email pattern
            setIsUATUser(true);
          }
        } catch {
          // Email pattern match is sufficient
          setIsUATUser(true);
        }
      } else {
        setIsUATUser(false);
      }

      setIsLoading(false);
    };

    checkUATStatus();
  }, [user?.email]);

  const getPageGuidance = (pathname: string): UATPageGuidance | null => {
    // Exact match first
    if (UAT_PAGE_GUIDANCE[pathname]) {
      return UAT_PAGE_GUIDANCE[pathname];
    }

    // Check for prefix matches
    for (const [route, guidance] of Object.entries(UAT_PAGE_GUIDANCE)) {
      if (pathname.startsWith(route) && route !== '/') {
        return guidance;
      }
    }

    // Default guidance for unspecified pages
    return {
      route: 'general',
      title: 'General Testing',
      testingTips: [
        'Check page loads without errors',
        'Verify all interactive elements work',
        'Test on different screen sizes',
        'Check for console errors'
      ],
      expectedBehaviors: [
        'Page renders completely',
        'No JavaScript errors in console',
        'All buttons/links are clickable',
        'Data displays correctly'
      ],
      bugReportPrompts: [
        'Page not loading',
        'Error message displayed',
        'Feature not working as expected',
        'UI/layout issue'
      ]
    };
  };

  const formatBugReport = (issue: string, details: string = '') => {
    return {
      timestamp: new Date().toISOString(),
      user: user?.email || 'unknown',
      accountType: uatAccount?.account_type || 'unknown',
      issue,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  };

  return {
    isUATUser,
    uatAccount,
    isLoading,
    getPageGuidance,
    formatBugReport
  };
};
