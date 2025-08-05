
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUserProgress } from '@/hooks/useUserProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lock, BookOpen, Award } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const TOTAL_MODULES = 18;
const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

const CourseLayout: React.FC = () => {
  
  const {
    getCompletedModulesCount,
    getTotalScore,
    isModuleCompleted,
    migrateFromLocalStorage,
    isLoading
  } = useUserProgress(COURSE_ID);

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

  const moduleList = Array.from({ length: TOTAL_MODULES }, (_, i) => ({
    id: `part${i + 1}`,
    title: `Part ${i + 1}`,
    description: `Module description for Part ${i + 1}`
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Maryland Responsible Vendor Training (RVT) Course
          </CardTitle>
          <p className="text-muted-foreground">
            Complete all modules to unlock the final exam and earn your certificate
          </p>
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
        {moduleList.map((module) => (
          <Card key={module.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <Link 
                to={`/course/${module.id}`} 
                className="block"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="font-medium">{module.title}</span>
                    {isModuleCompleted(module.id) && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <Badge variant={isModuleCompleted(module.id) ? "default" : "secondary"}>
                    {isModuleCompleted(module.id) ? 'Completed' : 'Available'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </Link>
            </CardContent>
          </Card>
        ))}
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
  );
};

export default CourseLayout;
