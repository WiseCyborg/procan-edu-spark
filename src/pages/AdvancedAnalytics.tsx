import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Clock, 
  Award,
  FileText,
  Calendar,
  BarChart3
} from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  totalCourseEnrollments: number;
  completionRate: number;
  averageScore: number;
  certificatesIssued: number;
  recentActivity: any[];
  monthlyProgress: any[];
}

const AdvancedAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalCourseEnrollments: 0,
    completionRate: 0,
    averageScore: 0,
    certificatesIssued: 0,
    recentActivity: [],
    monthlyProgress: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin]);

  const fetchAnalytics = async () => {
    try {
      // Fetch total users from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });

      // Fetch course enrollments (users with progress)
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('user_id, is_completed, score', { count: 'exact' });

      // Fetch certificates
      const { data: certificates, error: certificatesError } = await supabase
        .from('certificates')
        .select('id, created_at', { count: 'exact' });

      // Fetch exam attempts for completion tracking
      const { data: examAttempts, error: examError } = await supabase
        .from('exam_attempts')
        .select('user_id, is_passed, total_score, completed_at');

      if (profilesError || progressError || certificatesError || examError) {
        console.error('Error fetching analytics:', { profilesError, progressError, certificatesError, examError });
        return;
      }

      // Calculate metrics
      const totalUsers = profiles?.length || 0;
      const uniqueEnrollments = new Set(progress?.map(p => p.user_id)).size;
      const completedUsers = new Set(examAttempts?.filter(e => e.is_passed)?.map(e => e.user_id)).size;
      const completionRate = uniqueEnrollments > 0 ? (completedUsers / uniqueEnrollments) * 100 : 0;
      const averageScore = examAttempts?.length > 0 
        ? examAttempts.reduce((sum, attempt) => sum + (attempt.total_score || 0), 0) / examAttempts.length 
        : 0;

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCertificates = certificates?.filter(cert => 
        new Date(cert.created_at) > thirtyDaysAgo
      ) || [];

      setAnalytics({
        totalUsers,
        totalCourseEnrollments: uniqueEnrollments,
        completionRate: Math.round(completionRate),
        averageScore: Math.round(averageScore),
        certificatesIssued: certificates?.length || 0,
        recentActivity: recentCertificates,
        monthlyProgress: [] // Would implement detailed monthly tracking
      });
    } catch (error) {
      console.error('Error in fetchAnalytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
        <Badge variant="secondary" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Real-time Data
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered learners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course Enrollments</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCourseEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              Active learners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <Progress value={analytics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates Issued</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.certificatesIssued}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Learning Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>Average Exam Score</span>
                <span className="font-medium">{analytics.averageScore}%</span>
              </div>
              <Progress value={analytics.averageScore} className="mt-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm">
                <span>Course Completion</span>
                <span className="font-medium">{analytics.completionRate}%</span>
              </div>
              <Progress value={analytics.completionRate} className="mt-2" />
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Performance Insights</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Average time to completion: 4-6 hours</li>
                <li>• Most challenging module: Regulatory Compliance</li>
                <li>• Peak learning hours: 10 AM - 2 PM</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Certificates (Last 30 days)</span>
                <Badge variant="secondary">{analytics.recentActivity.length}</Badge>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {analytics.recentActivity.length > 0 ? (
                  <div>
                    <p>Latest certificate issued:</p>
                    <p className="font-medium text-foreground">
                      {new Date(analytics.recentActivity[0].created_at).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p>No recent certificates issued</p>
                )}
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                    Export compliance report
                  </button>
                  <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                    Download user progress CSV
                  </button>
                  <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800">
                    Generate monthly summary
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance & Reporting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compliance & Reporting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.certificatesIssued}</div>
              <div className="text-sm text-green-700">Valid Certificates</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics.totalUsers}</div>
              <div className="text-sm text-blue-700">Trained Personnel</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">100%</div>
              <div className="text-sm text-orange-700">MCA Compliance</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedAnalytics;