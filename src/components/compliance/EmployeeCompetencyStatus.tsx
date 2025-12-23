import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, User, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';

interface SignOff {
  id: string;
  competency_area: string;
  signed_off_at: string;
  is_floor_observation: boolean;
  supervisor_user_id: string;
  supervisor?: {
    first_name: string;
    last_name: string;
  };
}

interface EmployeeCompetencyStatusProps {
  employeeId: string;
  employeeName?: string;
  organizationId: string;
  requiredCompetencies?: string[];
}

const COMPETENCY_LABELS: Record<string, string> = {
  id_verification: 'ID Verification',
  product_knowledge: 'Product Knowledge',
  compliance_protocols: 'Compliance Protocols',
  customer_service: 'Customer Service',
  diversion_prevention: 'Diversion Prevention',
  safety_procedures: 'Safety Procedures',
  inventory_management: 'Inventory Management',
  pos_operations: 'POS Operations',
};

export const EmployeeCompetencyStatus = ({ 
  employeeId, 
  employeeName,
  organizationId,
  requiredCompetencies = ['id_verification', 'product_knowledge', 'compliance_protocols']
}: EmployeeCompetencyStatusProps) => {
  const { data: signoffs, isLoading } = useQuery({
    queryKey: ['employee-signoffs', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supervisor_signoffs')
        .select(`
          id,
          competency_area,
          signed_off_at,
          is_floor_observation,
          supervisor_user_id
        `)
        .eq('employee_user_id', employeeId)
        .eq('organization_id', organizationId)
        .order('signed_off_at', { ascending: false });

      if (error) throw error;
      return data as SignOff[];
    }
  });

  // Get unique competencies that have been signed off
  const signedOffCompetencies = new Set(signoffs?.map(s => s.competency_area) || []);
  const completedCount = requiredCompetencies.filter(c => signedOffCompetencies.has(c)).length;
  const completionPercentage = (completedCount / requiredCompetencies.length) * 100;

  const getLatestSignOff = (competency: string) => {
    return signoffs?.find(s => s.competency_area === competency);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading competency status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {employeeName || 'Employee'} Competency Status
          </div>
          <Badge 
            variant={completionPercentage === 100 ? 'default' : 'secondary'}
            className={completionPercentage === 100 ? 'bg-green-500' : ''}
          >
            {completedCount}/{requiredCompetencies.length} Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Competency Completion</span>
            <span>{Math.round(completionPercentage)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        <div className="space-y-2">
          {requiredCompetencies.map((competency) => {
            const signOff = getLatestSignOff(competency);
            const isComplete = !!signOff;

            return (
              <div 
                key={competency}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isComplete ? 'bg-green-50 border-green-200 dark:bg-green-950/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {COMPETENCY_LABELS[competency] || competency}
                    </p>
                    {signOff && (
                      <p className="text-xs text-muted-foreground">
                        Verified {format(new Date(signOff.signed_off_at), 'MMM d, yyyy')}
                        {signOff.is_floor_observation && (
                          <span className="ml-2">
                            <ClipboardCheck className="h-3 w-3 inline" /> Floor Observed
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {isComplete ? (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Pending
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
