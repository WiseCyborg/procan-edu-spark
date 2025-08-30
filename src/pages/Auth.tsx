
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import SmartAuthForm from '@/components/auth/SmartAuthForm';
import DispensaryAuthForm from '@/components/auth/DispensaryAuthForm';
import StudentAuthForm from '@/components/auth/StudentAuthForm';
import AdminAuthForm from '@/components/auth/AdminAuthForm';
import DispensaryManagerAuthForm from '@/components/auth/DispensaryManagerAuthForm';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');

  // Route to appropriate auth form based on role parameter
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

export default Auth;
