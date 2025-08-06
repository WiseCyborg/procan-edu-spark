
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, BookOpen, BarChart3, Award } from 'lucide-react';

const Header = () => {
  const { user, signOut } = useAuth();
  const { isDispensaryManager, isAdmin, roles } = useUserRole();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-green-700">ProCann Edu</h1>
          <span className="text-sm text-gray-600">Maryland Cannabis Training</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {!user && (
            <div className="flex items-center space-x-2">
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
            </div>
          )}
          
          {user && (
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex items-center space-x-4">
                <Button 
                  onClick={() => navigate('/course')}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Course</span>
                </Button>
                <Button 
                  onClick={() => navigate('/certificates')}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Award className="w-4 h-4" />
                  <span>Certificates</span>
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
                {(isDispensaryManager || isAdmin) && (
                  <Button 
                    onClick={() => navigate('/dispensary-portal')}
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Dispensary Portal</span>
                  </Button>
                )}
              </nav>
              
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
                    <DropdownMenuItem onClick={() => navigate('/certificates')}>
                      <Award className="w-4 h-4 mr-2" />
                      My Certificates
                    </DropdownMenuItem>
                    {(isDispensaryManager || isAdmin) && (
                      <DropdownMenuItem onClick={() => navigate('/dispensary-portal')}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dispensary Portal
                      </DropdownMenuItem>
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
    </header>
  );
};

export default Header;
