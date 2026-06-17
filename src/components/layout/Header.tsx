import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, MessageSquare, BookOpen, Award, BarChart3, Users, Mail, Building2, CreditCard, ShoppingCart, Home, FileText, GraduationCap, HelpCircle, Shield, ChevronDown, Keyboard, LayoutDashboard, Loader2 } from 'lucide-react';
import { CommunicationHub } from '@/components/communication/CommunicationHub';
import { PurchaseSeatsDialog } from '@/components/team/PurchaseSeatsDialog';
import { RoleSwitcher } from '@/components/navigation/RoleSwitcher';
import { DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { useKeyboardShortcuts } from '@/contexts/KeyboardShortcutsContext';
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation';
import { supabase } from '@/integrations/supabase/client';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';
import { SaveIndicator } from '@/components/auth/SaveIndicator';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { usePreferredLanguage } from '@/hooks/usePreferredLanguage';

interface HeaderProps {
  role?: string;
}

// Public routes where we show marketing navigation (not app navigation)
const PUBLIC_MARKETING_ROUTES = [
  '/',
  '/faq',
  '/verify-certificate',
  '/consumer-education',
  '/dispensary-portal',
  '/employers',
  '/about',
  '/get-started',
  '/stoplight-standard',
  '/privacy-policy',
  '/terms-of-service',
  '/roi-calculator',
  '/success-stories'
];

const Header = ({ role: headerRole }: HeaderProps = {}) => {
  const { user, signOut } = useAuth();
  const { isDispensaryManager, isTrainingCoordinator, isAdmin, roles, hasMultipleManagementRoles, managementRoles } = useUserRole();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCommunicationHub, setShowCommunicationHub] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentRoleView, setCurrentRoleView] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if we're on a public marketing route
  const isPublicMarketingRoute = PUBLIC_MARKETING_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  // Get the user's appropriate dashboard route
  const getDashboardRoute = () => {
    if (isAdmin) return '/admin';
    if (isTrainingCoordinator) return '/training-coordinator-dashboard';
    if (isDispensaryManager) return '/dispensary-manager-dashboard';
    return '/student-dashboard';
  };

  const { flags } = useFeatureFlags();
  const { setShortcutsDialogOpen } = useKeyboardShortcuts();
  const { navigateToDashboard, state: navState } = useGuardedNavigation();

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const handleSignOutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    navigate('/');
  };

  // Handle guarded dashboard navigation
  const handleGoToDashboard = async () => {
    await navigateToDashboard();
  };

  React.useEffect(() => {
    if (managementRoles.length > 0) {
      const saved = sessionStorage.getItem('selected_role_view');
      setCurrentRoleView(saved || managementRoles[0].replace('_', ' '));
    }
  }, [managementRoles]);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, conversations(id)')
        .eq('user_id', user.id);

      if (error || !data) return;

      let total = 0;
      for (const participant of data) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', participant.conversation_id)
          .gt('created_at', participant.last_read_at || '1970-01-01');
        
        total += count || 0;
      }
      setUnreadCount(total);
    };

    fetchUnreadCount();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('header-unread-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, fetchUnreadCount)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Register keyboard shortcuts
  useKeyboardShortcut({
    key: 'm',
    ctrlKey: true,
    metaKey: true,
    action: () => navigate('/communication'),
    description: 'Open Communication Hub',
    category: 'navigation'
  });

  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-50" role={headerRole}>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => navigate('/')}
            variant="ghost"
            className="p-0 h-auto hover:bg-transparent"
          >
            <h1 className="text-2xl font-bold text-green-700 hover:text-green-600 transition-colors">ProCann Edu</h1>
          </Button>
          <span className="text-sm text-gray-600">Maryland Cannabis Training</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Public Marketing Navigation - show for non-logged-in users OR logged-in users on public pages */}
          {(!user || isPublicMarketingRoute) && (
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => navigate('/training-handbook')}
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
              >
                Training Handbook
              </Button>
              <Button 
                onClick={() => navigate('/faq')}
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
              >
                FAQ
              </Button>
              <Button 
                onClick={() => navigate('/verify-certificate')}
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
              >
                Verify Certificate
              </Button>
              {!user ? (
                <>
                  <Button 
                    onClick={() => navigate('/auth')}
                    variant="outline"
                    size="sm"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => navigate('/get-started')}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Get Started
                  </Button>
                </>
              ) : (
                /* Logged-in user on public page - show Go to Dashboard CTA with guarded navigation */
                <Button 
                  onClick={handleGoToDashboard}
                  disabled={navState.isNavigating}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {navState.isNavigating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LayoutDashboard className="w-4 h-4" />
                  )}
                  Go to Dashboard
                </Button>
              )}
            </div>
          )}
          
          {/* App Navigation - show for logged-in users on non-public routes */}
          {user && !isPublicMarketingRoute && (
            <div className="flex items-center space-x-2">
              {/* Desktop Navigation - Dashboard, Training, Communication */}
              <nav className="hidden md:flex items-center space-x-1">
                <Button 
                  onClick={handleGoToDashboard}
                  disabled={navState.isNavigating}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Home className="w-4 h-4" />
                  <span>Dashboard</span>
                </Button>
                <Button 
                  onClick={() => navigate('/course')}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Training</span>
                </Button>
                <Button 
                  onClick={() => navigate('/communication')}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 relative"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Communication</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </nav>
            </div>
          )}
          
          {/* User Controls - Profile Dropdown for all logged-in users */}
          {user && (
            <div className="flex items-center space-x-2">
              {/* Keyboard Shortcuts Indicator - only on app routes */}
              {!isPublicMarketingRoute && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShortcutsDialogOpen(true)}
                      className="hidden md:flex"
                      aria-label="Open keyboard shortcuts"
                    >
                      <Keyboard className="h-4 w-4" aria-hidden="true" />
                    </Button>

                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded border">{isMac ? '⌘' : 'Ctrl'}/</kbd> for shortcuts</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-3">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline ml-2">Profile</span>
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      {roles.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          {roles.map((role) => (
                            <span
                              key={role}
                              className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-primary/10 text-primary uppercase"
                            >
                              {role.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Quick Links Section */}
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">
                    QUICK LINKS
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleGoToDashboard}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/course')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>My Training</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/certificates')}>
                    <Award className="mr-2 h-4 w-4" />
                    <span>Certificates</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/training-handbook')}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Training Handbook</span>
                  </DropdownMenuItem>
                  
                  {/* Team Section - Managers only */}
                  {(isDispensaryManager || isTrainingCoordinator) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">
                        TEAM
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate('/team-management')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Team Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/dispensary-manager-dashboard?tab=invite')}>
                        <Mail className="mr-2 h-4 w-4" />
                        <span>Invite Employee</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/dispensary-manager-dashboard?tab=seats')}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Manage Seats</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowPurchaseModal(true)}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        <span>Purchase Seats</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Admin Section - Admins only */}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">
                        ADMIN
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Resources Section */}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold px-2 py-1.5">
                    RESOURCES
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate('/consumer-education')}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    <span>Consumer Education</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/faq')}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>FAQ</span>
                  </DropdownMenuItem>
                  
                  {/* Role Switcher - Multi-role users only */}
                  {flags.multi_role_selector && hasMultipleManagementRoles && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-2">
                        <RoleSwitcher />
                      </div>
                    </>
                   )}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Save Status Indicator */}
                  <div className="px-2 py-1.5">
                    <SaveIndicator showAlways />
                  </div>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOutClick} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Purchase Seats Modal */}
      {showPurchaseModal && organization && (
        <PurchaseSeatsDialog
          open={showPurchaseModal}
          onOpenChange={setShowPurchaseModal}
          organizationId={organization.id}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirmLogout={handleConfirmLogout}
      />
    </header>
  );
};

export default Header;
