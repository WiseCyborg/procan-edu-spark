import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleTimeoutWarningModal } from './IdleTimeoutWarningModal';

interface IdleTimeoutProviderProps {
  children: React.ReactNode;
}

export const IdleTimeoutProvider: React.FC<IdleTimeoutProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Auth pages where idle timeout should not render
  const authPaths = [
    '/auth',
    '/forgot-password',
    '/accept-invitation',
    '/manager-registration',
    '/register/manager'
  ];
  
  const isAuthPage = authPaths.some(path => location.pathname.startsWith(path));
  
  // Only render the idle timeout hook when user is authenticated and not on auth pages
  if (!user || isAuthPage) {
    return <>{children}</>;
  }
  
  return <IdleTimeoutContent>{children}</IdleTimeoutContent>;
};

// Separate component to ensure hook is only called when conditions are met
const IdleTimeoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    showWarningModal,
    remainingSeconds,
    handleStaySignedIn,
    handleLogoutNow
  } = useIdleTimeout();

  return (
    <>
      {children}
      <IdleTimeoutWarningModal
        open={showWarningModal}
        remainingSeconds={remainingSeconds}
        onStaySignedIn={handleStaySignedIn}
        onLogoutNow={handleLogoutNow}
      />
    </>
  );
};
