
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserProgress } from '@/hooks/useUserProgress';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useOrganizationAccess } from '@/hooks/useOrganizationAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lock, BookOpen, Award } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { CoursePaymentGate } from '@/components/CoursePaymentGate';
import { ProtectedCourseAccess } from '@/components/ProtectedCourseAccess';
import { EmployeeAccessMessage } from '@/components/EmployeeAccessMessage';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { supabase } from '@/integrations/supabase/client';

const TOTAL_MODULES = 18;
const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

interface ModuleData {
  module_number: number;
  title: string;
  description: string | null;
  comar_reference: string | null;
}

const CourseLayout: React.FC = () => {
  const { user } = useAuth();
  const { roles, isStudent, isAdmin, isDispensaryManager, isLoading: rolesLoading } = useUserRole();
  const [course] = useState({
    id: COURSE_ID,
    title: 'Maryland Responsible Vendor Training (RVT)',
    description: 'Complete cannabis education course for Maryland compliance',
    price_cents: 4999,
    currency: 'usd',
    payment_required: true
  });
  const [modules, setModules] = useState<ModuleData[]>([]);

  const { hasPaid, isLoading: paymentLoading } = usePaymentStatus(COURSE_ID);
  const { hasAccess: hasOrgAccess, isLoading: orgLoading, organizationName } = useOrganizationAccess(user?.id);
  
  const {
    getCompletedModulesCount,
    getTotalScore,
    isModuleCompleted,
    migrateFromLocalStorage,
    isLoading
  } = useUserProgress(COURSE_ID);

  useEffect(() => {
    const fetchModules = async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('module_number, title, description, comar_reference')
        .eq('course_id', COURSE_ID)
        .eq('is_active', true)
        .order('module_number');

      if (data && !error) {
        setModules(data);
      }
    };

    fetchModules();
  }, []);

  // Determine user's access type
  const accessType = useMemo(() => {
    if (!user) return 'NEEDS_AUTH';
    if (isAdmin || isDispensaryManager) return 'ADMIN_ACCESS';
    if (isStudent && hasOrgAccess) return 'ORG_EMPLOYEE_ACCESS';
    if (isStudent && !hasOrgAccess) return 'NEEDS_ACCESS_KEY';
    if (hasPaid) return 'INDIVIDUAL_PAID';
    return 'NEEDS_PAYMENT';
  }, [user, isAdmin, isDispensaryManager, isStudent, hasOrgAccess, hasPaid]);

  useEffect(() => {
    // Migrate any existing localStorage data to Supabase
    migrateFromLocalStorage(COURSE_ID);
  }, []);

  const updateProgress = () => {
    const completedCount = getCompletedModulesCount();
    const averageScore = getTotalScore();
    return `${completedCount}/${TOTAL_MODULES} modules completed${averageScore > 0 ? ` • Average score: ${averageScore}%` : ''}`;
  };

  const isExamEnabled = getCompletedModulesCount() === TOTAL_MODULES;

  // Show loading state
  if (isLoading || paymentLoading || rolesLoading || orgLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show employee access message if student without organization access
  if (accessType === 'NEEDS_ACCESS_KEY') {
    return (
      <ProtectedCourseAccess>
        <EmployeeAccessMessage />
      </ProtectedCourseAccess>
    );
  }

  // Show payment gate only for individual users (not employees)
  if (accessType === 'NEEDS_PAYMENT' && course.payment_required) {
    return (
      <ProtectedCourseAccess>
        <CoursePaymentGate 
          course={course} 
          onPaymentSuccess={() => window.location.reload()} 
        />
      </ProtectedCourseAccess>
    );
  }

  // Grant access for: ADMIN_ACCESS, ORG_EMPLOYEE_ACCESS, INDIVIDUAL_PAID

  return (
    <ProtectedCourseAccess>
      <div className="container mx-auto p-6 space-y-6">
      <Breadcrumbs />
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Maryland Responsible Vendor Training (RVT) Course
          </CardTitle>
          <p className="text-muted-foreground">
            Complete all modules to unlock the final exam and earn your certificate
          </p>
          {organizationName && (
            <p className="text-sm text-muted-foreground mt-2">
              Enrolled through: <strong>{organizationName}</strong>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {updateProgress()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {modules.map((module) => {
          const moduleId = `part${module.module_number}`;
          const tierColor = module.module_number <= 6 ? 'text-green-600' : 
                           module.module_number <= 12 ? 'text-yellow-600' : 
                           'text-red-600';
          
          return (
            <Card key={moduleId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link 
                  to={`/course/${moduleId}`} 
                  className="block"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <BookOpen className={`w-5 h-5 ${tierColor}`} />
                      <span className="font-medium">Module {module.module_number}</span>
                      {isModuleCompleted(moduleId) && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <Badge variant={isModuleCompleted(moduleId) ? "default" : "secondary"}>
                      {isModuleCompleted(moduleId) ? 'Completed' : 'Available'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{module.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{module.description}</p>
                  {module.comar_reference && (
                    <Badge variant="outline" className="text-xs">
                      {module.comar_reference}
                    </Badge>
                  )}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className={`${isExamEnabled ? 'border-primary' : 'border-muted'}`}>
        <CardContent className="p-6">
          <Link 
            to="/course/final-exam" 
            className={`flex items-center justify-center space-x-2 ${
              !isExamEnabled && 'pointer-events-none'
            }`}
            onClick={(e) => !isExamEnabled && e.preventDefault()}
          >
            <div className="flex items-center space-x-3">
              {isExamEnabled ? (
                <Award className="w-6 h-6 text-primary" />
              ) : (
                <Lock className="w-6 h-6 text-muted-foreground" />
              )}
              <div className="text-center">
                <h3 className={`text-xl font-bold ${
                  isExamEnabled ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  Final Exam & Certificate
                </h3>
                {!isExamEnabled && (
                  <p className="text-sm text-muted-foreground">
                    Complete all modules to unlock
                  </p>
                )}
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
      </div>
    </ProtectedCourseAccess>
  );
};

export default CourseLayout;
