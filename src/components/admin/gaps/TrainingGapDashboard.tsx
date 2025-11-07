import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { detectTrainingGaps } from '@/services/gapDetectionService';
import { GapAlert } from './GapAlert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Award, AlertCircle, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export const TrainingGapDashboard = () => {
  const { data: gaps, isLoading } = useQuery({
    queryKey: ['training-gaps'],
    queryFn: detectTrainingGaps,
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  const handleSendReminder = (gap: any) => {
    toast.success('Training reminder sent', {
      description: `Reminder sent for ${gap.affected_entity}`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Training Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gaps || gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Training Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Training On Track</h3>
            <p className="text-sm text-muted-foreground">
              No training gaps detected across all organizations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expiredCerts = gaps.filter(g => g.title.includes('Expired'));
  const lowCompletion = gaps.filter(g => g.title.includes('Low Training'));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gaps</p>
                <p className="text-3xl font-bold">{gaps.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired Certificates</p>
                <p className="text-3xl font-bold">{expiredCerts.length}</p>
              </div>
              <Award className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Completion</p>
                <p className="text-3xl font-bold">{lowCompletion.length}</p>
              </div>
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expired Certificates */}
      {expiredCerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-600" />
              Expired Certificates ({expiredCerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiredCerts.map(gap => (
                <GapAlert
                  key={gap.id}
                  gap={gap}
                  onAction={handleSendReminder}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Completion Organizations */}
      {lowCompletion.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-600" />
              Organizations with Low Completion ({lowCompletion.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowCompletion.map(gap => (
                  <TableRow key={gap.id}>
                    <TableCell className="font-medium">{gap.affected_entity}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {gap.metadata?.completion_rate?.toFixed(0)}% ({gap.metadata?.user_count} users)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={gap.severity === 'high' ? 'destructive' : 'secondary'}>
                        {gap.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendReminder(gap)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Send Reminder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
