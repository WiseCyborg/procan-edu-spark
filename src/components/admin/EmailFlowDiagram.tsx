import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';

interface EmailFlowStep {
  id: string;
  label: string;
  status: 'completed' | 'pending' | 'failed' | 'skipped';
  timestamp?: string;
}

interface EmailFlowDiagramProps {
  steps: EmailFlowStep[];
}

export const EmailFlowDiagram = ({ steps }: EmailFlowDiagramProps) => {
  const getStepIcon = (status: EmailFlowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'skipped':
        return <div className="h-6 w-6 rounded-full border-2 border-muted-foreground" />;
    }
  };

  const getStepBadge = (status: EmailFlowStep['status']) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      skipped: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Pipeline Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {getStepIcon(step.status)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold">{step.label}</h4>
                    {getStepBadge(step.status)}
                  </div>
                  {step.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(step.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="ml-3 my-2 h-8 border-l-2 border-muted-foreground/20" />
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {steps.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {steps.filter(s => s.status === 'pending').length}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {steps.filter(s => s.status === 'failed').length}
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {steps.filter(s => s.status === 'skipped').length}
            </div>
            <div className="text-xs text-muted-foreground">Skipped</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};