
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Header = () => {
  const { user, signOut } = useAuth();
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
        
        {user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User size={20} className="text-gray-600" />
              <span className="text-sm text-gray-700">{user.email}</span>
            </div>
            <Button 
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
