
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, MessageSquare, BookOpen, Award, BarChart3, Users, Mail, Building2, CreditCard, ShoppingCart, Home, FileText, GraduationCap, HelpCircle, Shield, ChevronDown } from 'lucide-react';
import { CommunicationHub } from '@/components/communication/CommunicationHub';
import { PurchaseSeatsDialog } from '@/components/team/PurchaseSeatsDialog';
import { RoleSwitcher } from '@/components/navigation/RoleSwitcher';
import { DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';

interface HeaderProps {
  role?: string;
}

const Header = ({ role: headerRole }: HeaderProps = {}) => {
  const { user, signOut } = useAuth();
  const { isDispensaryManager, isTrainingCoordinator, isAdmin, roles, hasMultipleManagementRoles, managementRoles } = useUserRole();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [showCommunicationHub, setShowCommunicationHub] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [currentRoleView, setCurrentRoleView] = useState<string>('');

  const { flags } = useFeatureFlags();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  React.useEffect(() => {
    if (managementRoles.length > 0) {
      const saved = sessionStorage.getItem('selected_role_view');
      setCurrentRoleView(saved || managementRoles[0].replace('_', ' '));
    }
  }, [managementRoles]);

  return (
    <header className="bg-white border-b shadow-sm" role={headerRole}>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => {
              // Navigate to default dashboard based on highest priority role
              if (isAdmin) navigate('/admin-dashboard');
              else if (isTrainingCoordinator) navigate('/training-coordinator-dashboard');
              else if (isDispensaryManager) navigate('/dispensary-manager-dashboard');
              else if (user) navigate('/student-dashboard');
              else navigate('/');
            }}
            variant="ghost"
            className="p-0 h-auto hover:bg-transparent"
          >
            <h1 className="text-2xl font-bold text-green-700 hover:text-green-600 transition-colors">ProCann Edu</h1>
          </Button>
          <span className="text-sm text-gray-600">Maryland Cannabis Training</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {!user && (
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => navigate('/training-handbook')}
                variant="ghost"
                size="sm"
              >
                Training Handbook
              </Button>
              <Button 
                onClick={() => navigate('/faq')}
                variant="ghost"
                size="sm"
              >
                FAQ
              </Button>
              <Button 
                onClick={() => navigate('/verify-certificate')}
                variant="ghost"
                size="sm"
              >
                Verify Certificate
              </Button>
              <Button 
                onClick={() => navigate('/auth?role=admin')}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
              >
                Admin Login
              </Button>
            </div>
          )}
          
          {user && (
            <div className="flex items-center space-x-2">
              {/* Desktop Navigation - Only Dashboard and Training */}
              <nav className="hidden md:flex items-center space-x-1">
                <Button 
                  onClick={() => navigate('/')}
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
              </nav>
              
              {/* Messages Button */}
              <Dialog open={showCommunicationHub} onOpenChange={setShowCommunicationHub}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden md:inline">Messages</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl h-[80vh] p-0">
                  <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Team Communication</DialogTitle>
                  </DialogHeader>
                  <div className="p-6 pt-4 h-full">
                    <CommunicationHub />
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* User Profile Dropdown - Expanded with organized sections */}
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
                  <DropdownMenuItem onClick={() => navigate('/')}>
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
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
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
      <MobileBottomNav onMessagesClick={() => setShowCommunicationHub(true)} />
      
      {/* Purchase Seats Modal */}
      {showPurchaseModal && organization && (
        <PurchaseSeatsDialog
          open={showPurchaseModal}
          onOpenChange={setShowPurchaseModal}
          organizationId={organization.id}
        />
      )}
    </header>
  );
};

export default Header;
