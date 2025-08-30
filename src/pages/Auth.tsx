
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import SmartAuthForm from '@/components/auth/SmartAuthForm';
import DispensaryAuthForm from '@/components/auth/DispensaryAuthForm';
import StudentAuthForm from '@/components/auth/StudentAuthForm';
import AdminAuthForm from '@/components/auth/AdminAuthForm';
import DispensaryManagerAuthForm from '@/components/auth/DispensaryManagerAuthForm';
import { PasswordReset } from '@/components/auth/PasswordReset';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const mode = searchParams.get('mode');

  // Handle password reset mode
  if (mode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <PasswordReset />
      </div>
    );
  }

  // Route to appropriate auth form based on role parameter
  const renderAuthForm = () => {
    switch (role) {
      case 'admin':
        return <AdminAuthForm />;
      case 'dispensary':
        return <DispensaryAuthForm />;
      case 'dispensary_manager':
        return <DispensaryManagerAuthForm />;
      case 'student':
        return <StudentAuthForm />;
      default:
        return <SmartAuthForm />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      {renderAuthForm()}
    </div>
  );
};

export default Auth;
