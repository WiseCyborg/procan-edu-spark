import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { ExamAnalyticsDashboard } from '@/components/admin/ExamAnalyticsDashboard';

const ExamAnalyticsPage: React.FC = () => {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <ExamAnalyticsDashboard />
    </div>
  );
};

export default ExamAnalyticsPage;
