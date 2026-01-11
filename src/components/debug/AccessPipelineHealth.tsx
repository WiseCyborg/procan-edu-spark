import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccessSnapshot } from '@/hooks/useAccessSnapshot';
import { useCourseState } from '@/hooks/useCourseState';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Wifi, Database, User, Shield } from 'lucide-react';

interface HealthCheckResult {
  name: string;
  status: 'ok' | 'error' | 'warning' | 'checking';
  message: string;
  icon: React.ReactNode;
}

/**
 * DEV-only component to verify access pipeline health.
 * Shows session, DB connection, access snapshot, and resume state.
 */
export const AccessPipelineHealth: React.FC<{ courseId?: string }> = ({ courseId }) => {
  const { user, loading: authLoading } = useAuth();
  const { snapshot, isLoading: snapshotLoading, isError: snapshotError, refetch: refetchSnapshot } = useAccessSnapshot(courseId);
  const { courseState, isLoading: courseStateLoading, refetch: refetchCourseState } = useCourseState(courseId);
  
  const [checks, setChecks] = useState<HealthCheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runHealthCheck = async () => {
    setIsRunning(true);
    const results: HealthCheckResult[] = [];

    // 1. Session check
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        results.push({
          name: 'Session',
          status: 'error',
          message: error?.message || 'No active session',
          icon: <User className="h-4 w-4" />,
        });
      } else {
        results.push({
          name: 'Session',
          status: 'ok',
          message: `Authenticated as ${data.session.user.email}`,
          icon: <User className="h-4 w-4" />,
        });
      }
    } catch (e) {
      results.push({
        name: 'Session',
        status: 'error',
        message: 'Failed to check session',
        icon: <User className="h-4 w-4" />,
      });
    }

    // 2. DB Connection check (simple ping)
    try {
      const { error } = await supabase.from('courses').select('id').limit(1);
      if (error) {
        results.push({
          name: 'Database',
          status: 'error',
          message: error.message,
          icon: <Database className="h-4 w-4" />,
        });
      } else {
        results.push({
          name: 'Database',
          status: 'ok',
          message: 'Connected',
          icon: <Database className="h-4 w-4" />,
        });
      }
    } catch (e) {
      results.push({
        name: 'Database',
        status: 'error',
        message: 'Connection failed',
        icon: <Database className="h-4 w-4" />,
      });
    }

    // 3. Access Snapshot check
    if (snapshotLoading) {
      results.push({
        name: 'Access Snapshot',
        status: 'checking',
        message: 'Loading...',
        icon: <Shield className="h-4 w-4" />,
      });
    } else if (snapshotError) {
      results.push({
        name: 'Access Snapshot',
        status: 'error',
        message: 'Failed to load access snapshot',
        icon: <Shield className="h-4 w-4" />,
      });
    } else {
      results.push({
        name: 'Access Snapshot',
        status: snapshot.can_access_course ? 'ok' : 'warning',
        message: snapshot.can_access_course 
          ? `Access granted (${snapshot.entitlement_access})`
          : `Denied: ${snapshot.deny_reason}`,
        icon: <Shield className="h-4 w-4" />,
      });
    }

    // 4. Course State / Resume check
    if (courseStateLoading) {
      results.push({
        name: 'Course State',
        status: 'checking',
        message: 'Loading...',
        icon: <Wifi className="h-4 w-4" />,
      });
    } else if (!courseState) {
      results.push({
        name: 'Course State',
        status: 'warning',
        message: 'No course state loaded',
        icon: <Wifi className="h-4 w-4" />,
      });
    } else {
      const resumeTarget = courseState.resume_target;
      results.push({
        name: 'Course State',
        status: 'ok',
        message: resumeTarget 
          ? `Resume: Module ${resumeTarget.module_number}, Tab: ${resumeTarget.last_tab}`
          : 'No resume point saved',
        icon: <Wifi className="h-4 w-4" />,
      });
    }

    setChecks(results);
    setIsRunning(false);
  };

  useEffect(() => {
    if (!authLoading) {
      runHealthCheck();
    }
  }, [authLoading, snapshotLoading, courseStateLoading]);

  const handleRefresh = () => {
    refetchSnapshot();
    refetchCourseState();
    runHealthCheck();
  };

  const getStatusColor = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'ok': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'checking': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'checking': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  // Only show in development or for admins
  const isDev = import.meta.env.DEV;
  if (!isDev && !snapshot.roles?.includes('admin')) {
    return null;
  }

  return (
    <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/5">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Access Pipeline Health
            <Badge variant="outline" className="text-[10px] ml-2">DEV</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRunning}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${isRunning ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {checks.map((check, i) => (
          <div 
            key={i} 
            className={`flex items-center justify-between p-2 rounded-md border ${getStatusColor(check.status)}`}
          >
            <div className="flex items-center gap-2">
              {check.icon}
              <span className="text-xs font-medium">{check.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">{check.message}</span>
              {getStatusIcon(check.status)}
            </div>
          </div>
        ))}
        
        {/* Quick debug info */}
        <div className="pt-2 border-t mt-2">
          <p className="text-[10px] text-muted-foreground font-mono">
            User: {user?.id?.slice(0, 8) || 'none'} | 
            Roles: {snapshot.roles?.join(', ') || 'none'} | 
            Org: {snapshot.org_name || 'none'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccessPipelineHealth;
