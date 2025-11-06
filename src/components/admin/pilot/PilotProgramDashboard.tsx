import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, CheckCircle, Clock, TrendingUp, Award, Mail } from 'lucide-react';

export const PilotProgramDashboard = () => {
  const { data: pilotStats, isLoading } = useQuery({
    queryKey: ['pilot-program-stats'],
    queryFn: async () => {
      // Get pilot organization (Demo Dispensary or marked as pilot)
      const { data: pilotOrgs } = await supabase
        .from('organizations')
        .select('id, name')
        .or('name.ilike.%demo%,name.ilike.%pilot%,name.ilike.%beta%');

      if (!pilotOrgs || pilotOrgs.length === 0) {
        return {
          totalParticipants: 0,
          activeParticipants: 0,
          completedCertifications: 0,
          averageProgress: 0,
          averageScore: 0,
          participants: []
        };
      }

      const orgIds = pilotOrgs.map(o => o.id);

      // Get all users from pilot organizations
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, organization_id')
        .in('organization_id', orgIds);

      if (!profiles || profiles.length === 0) {
        return {
          totalParticipants: 0,
          activeParticipants: 0,
          completedCertifications: 0,
          averageProgress: 0,
          averageScore: 0,
          participants: []
        };
      }

      const userIds = profiles.map(p => p.user_id);

      // Get progress data
      const { data: progress } = await supabase
        .from('user_progress')
        .select('user_id, is_completed, score')
        .in('user_id', userIds);

      // Get certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('user_id, certificate_number, created_at')
        .in('user_id', userIds);

      // Calculate statistics
      const userProgress = userIds.map(userId => {
        const userModules = progress?.filter(p => p.user_id === userId) || [];
        const completedModules = userModules.filter(m => m.is_completed).length;
        const avgScore = userModules.length > 0
          ? userModules.reduce((sum, m) => sum + (m.score || 0), 0) / userModules.length
          : 0;
        const hasCertificate = certificates?.some(c => c.user_id === userId);
        const profile = profiles.find(p => p.user_id === userId);

        return {
          userId,
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
          completedModules,
          totalModules: 23,
          progressPercent: Math.round((completedModules / 23) * 100),
          avgScore: Math.round(avgScore),
          hasCertificate,
          certificateDate: certificates?.find(c => c.user_id === userId)?.created_at
        };
      });

      const activeParticipants = userProgress.filter(u => u.completedModules > 0).length;
      const totalProgress = userProgress.reduce((sum, u) => sum + u.progressPercent, 0);
      const totalScore = userProgress.reduce((sum, u) => sum + u.avgScore, 0);

      return {
        totalParticipants: userIds.length,
        activeParticipants,
        completedCertifications: certificates?.length || 0,
        averageProgress: userIds.length > 0 ? Math.round(totalProgress / userIds.length) : 0,
        averageScore: userIds.length > 0 ? Math.round(totalScore / userIds.length) : 0,
        participants: userProgress
      };
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading pilot program data...</div>;
  }

  const stats = pilotStats || {
    totalParticipants: 0,
    activeParticipants: 0,
    completedCertifications: 0,
    averageProgress: 0,
    averageScore: 0,
    participants: []
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pilot Program Dashboard</CardTitle>
          <CardDescription>
            Beta testing metrics and participant tracking for MCA application readiness
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalParticipants}</div>
                    <div className="text-xs text-muted-foreground">Total Participants</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.activeParticipants}</div>
                    <div className="text-xs text-muted-foreground">Active Users</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.completedCertifications}</div>
                    <div className="text-xs text-muted-foreground">Certifications</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.averageProgress}%</div>
                    <div className="text-xs text-muted-foreground">Avg Progress</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-teal-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.averageScore}%</div>
                    <div className="text-xs text-muted-foreground">Avg Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Participant Progress</h3>
            {stats.participants.length === 0 ? (
              <Card className="bg-muted/50">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold text-muted-foreground">No pilot participants yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Recruit 20-30 beta testers from existing dispensary contacts to validate the training workflow
                  </p>
                  <Button className="mt-4">
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Pilot Participants
                  </Button>
                </CardContent>
              </Card>
            ) : (
              stats.participants.map((participant: any) => (
                <Card key={participant.userId}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold">{participant.name || 'Anonymous User'}</p>
                        <p className="text-sm text-muted-foreground">
                          {participant.completedModules} of {participant.totalModules} modules completed
                        </p>
                      </div>
                      <div className="text-right">
                        {participant.hasCertificate ? (
                          <Badge variant="default" className="bg-green-500">
                            <Award className="h-3 w-3 mr-1" />
                            Certified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Avg Score: {participant.avgScore}%
                        </p>
                      </div>
                    </div>
                    <Progress value={participant.progressPercent} className="h-2" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
