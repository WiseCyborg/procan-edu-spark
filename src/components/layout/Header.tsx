
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, MessageSquare, BookOpen, Award, BarChart3, Users, Mail, Building2, CreditCard, ShoppingCart } from 'lucide-react';
import { CommunicationHub } from '@/components/communication/CommunicationHub';
import { IntelligentNavigation } from '@/components/navigation/IntelligentNavigation';
import { PurchaseSeatsDialog } from '@/components/team/PurchaseSeatsDialog';

interface HeaderProps {
  role?: string;
}

const Header = ({ role: headerRole }: HeaderProps = {}) => {
  const { user, signOut } = useAuth();
  const { isDispensaryManager, isTrainingCoordinator, isAdmin, roles } = useUserRole();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [showCommunicationHub, setShowCommunicationHub] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-white border-b shadow-sm" role={headerRole}>
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
            <div className="flex items-center space-x-4">
                <IntelligentNavigation />
                
                {/* Manager Quick Actions */}
                {(isDispensaryManager || isTrainingCoordinator) && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/dispensary-manager-dashboard?tab=employees')}
                      className="hidden md:flex items-center space-x-1"
                    >
                      <Users className="w-4 h-4" />
                      <span>My Team</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/dispensary-manager-dashboard?tab=invite')}
                      className="hidden lg:flex items-center space-x-1"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Invite</span>
                    </Button>
                  </div>
                )}
               
               {/* Communication Hub Button */}
               <Dialog open={showCommunicationHub} onOpenChange={setShowCommunicationHub}>
                 <DialogTrigger asChild>
                   <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                     <MessageSquare className="w-4 h-4" />
                     <span className="hidden sm:inline">Messages</span>
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
               
               <div className="flex items-center space-x-3">
                 <div className="flex space-x-1">
                   {roles.map(role => (
                     <Badge key={role} variant="secondary" className="text-xs">
                       {role.replace('_', ' ').toUpperCase()}
                     </Badge>
                   ))}
                 </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">{user.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-56">
                     <DropdownMenuItem onClick={() => navigate('/profile')}>
                       <User className="w-4 h-4 mr-2" />
                       Edit Profile
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => navigate('/course')}>
                       <BookOpen className="w-4 h-4 mr-2" />
                       My Courses
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => navigate('/training-handbook')}>
                       <BookOpen className="w-4 h-4 mr-2" />
                       Training Handbook
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => navigate('/certificates')}>
                       <Award className="w-4 h-4 mr-2" />
                       My Certificates
                     </DropdownMenuItem>
                     
                     {isDispensaryManager && (
                       <>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={() => navigate('/dispensary-manager-dashboard')}>
                           <Building2 className="w-4 h-4 mr-2" />
                           Team Dashboard
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => navigate('/dispensary-manager-dashboard?tab=employees')}>
                           <Users className="w-4 h-4 mr-2" />
                           View All Employees
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => navigate('/dispensary-manager-dashboard?tab=seats')}>
                           <CreditCard className="w-4 h-4 mr-2" />
                           Manage Seats
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setShowPurchaseModal(true)}>
                           <ShoppingCart className="w-4 h-4 mr-2" />
                           Purchase Seats
                         </DropdownMenuItem>
                       </>
                     )}
                     
                     {isTrainingCoordinator && !isDispensaryManager && (
                       <>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={() => navigate('/training-coordinator-dashboard')}>
                           <BarChart3 className="w-4 h-4 mr-2" />
                           Coordinator Dashboard
                         </DropdownMenuItem>
                       </>
                     )}
                     
                     <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={handleSignOut}>
                       <LogOut className="w-4 h-4 mr-2" />
                       Sign Out
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </div>
      
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
