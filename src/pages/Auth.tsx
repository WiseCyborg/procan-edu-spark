
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AuthForm from '@/components/auth/AuthForm';
import DispensaryAuthForm from '@/components/auth/DispensaryAuthForm';
import StudentAuthForm from '@/components/auth/StudentAuthForm';
import AdminAuthForm from '@/components/auth/AdminAuthForm';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');

  // Route to appropriate auth form based on role parameter
  switch (role) {
    case 'admin':
      return <AdminAuthForm />;
    case 'dispensary':
      return <DispensaryAuthForm />;
    case 'student':
      return <StudentAuthForm />;
    default:
      return <AuthForm />;
  }
};

export default Auth;
