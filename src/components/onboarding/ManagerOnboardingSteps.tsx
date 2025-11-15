import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  Building2, 
  Users, 
  Mail, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useOrganizationSeats } from '@/hooks/useOrganizationSeats';
import { Skeleton } from '@/components/ui/skeleton';

interface StepProps {
  organizationId: string | null;
  organizationName: string;
  onNext: () => void;
}

export const WelcomeStep = ({ organizationName, onNext }: StepProps) => (
  <CardContent className="pt-6 space-y-6 text-center">
    <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
      <Sparkles className="h-10 w-10 text-primary" />
    </div>
    
    <div className="space-y-2">
      <h2 className="text-3xl font-bold">Welcome to ProCann EDU!</h2>
      <p className="text-xl text-muted-foreground">
        {organizationName}
      </p>
    </div>
    
    <p className="text-muted-foreground max-w-md mx-auto">
      You're now the training manager for your organization. 
      This quick setup wizard will help you configure your RVT seats and invite your team.
    </p>
    
    <Button onClick={onNext} size="lg" className="mt-6">
      Let's Get Started
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </CardContent>
);

export const OrganizationSnapshotStep = ({ organizationName, onNext }: StepProps) => (
  <CardContent className="pt-6 space-y-6">
    <div className="flex items-center gap-3 mb-4">
      <Building2 className="h-6 w-6 text-primary" />
      <h2 className="text-2xl font-bold">Organization Overview</h2>
    </div>
    
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Organization Name</dt>
            <dd className="text-lg font-semibold">{organizationName}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <span>Organization profile confirmed</span>
    </div>
    
    <div className="flex gap-3 justify-end">
      <Button onClick={onNext}>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  </CardContent>
);

export const SeatOverviewStep = ({ organizationId, onNext }: StepProps) => {
  const { data: seats, isLoading } = useOrganizationSeats(organizationId);
  
  if (isLoading || !seats) {
    return (
      <CardContent className="pt-6 space-y-6">
        <Skeleton className="h-48 w-full" />
      </CardContent>
    );
  }
  
  const utilizationRate = seats.total > 0 ? Math.round((seats.used / seats.total) * 100) : 0;
  
  return (
    <CardContent className="pt-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Training Seats Overview</h2>
      </div>
      
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {seats.total}
              </div>
              <div className="text-sm text-muted-foreground">Total Training Seats</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Seat Utilization</span>
                <span className="font-semibold">{utilizationRate}%</span>
              </div>
              <Progress value={utilizationRate} className="h-2" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
              <div>
                <div className="text-2xl font-bold text-green-600">{seats.available}</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{seats.assigned}</div>
                <div className="text-xs text-muted-foreground">Assigned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{seats.used}</div>
                <div className="text-xs text-muted-foreground">Used</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <p className="text-sm text-muted-foreground text-center">
        Ready to invite your team? Let's get your employees started with their training.
      </p>
      
      <div className="flex gap-3 justify-end">
        <Button onClick={onNext}>
          Invite Employees
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  );
};

interface InviteStepProps extends StepProps {
  inviteEmails: string;
  setInviteEmails: (value: string) => void;
  onFinish: () => void;
  isLoading: boolean;
}

export const InviteEmployeesStep = ({ 
  inviteEmails, 
  setInviteEmails, 
  onFinish, 
  isLoading 
}: InviteStepProps) => (
  <CardContent className="pt-6 space-y-6">
    <div className="flex items-center gap-3 mb-4">
      <Mail className="h-6 w-6 text-primary" />
      <h2 className="text-2xl font-bold">Invite Your Team</h2>
    </div>
    
    <div className="space-y-2">
      <label className="text-sm font-medium">Employee Email Addresses</label>
      <Textarea
        placeholder="employee1@example.com&#10;employee2@example.com&#10;employee3@example.com"
        value={inviteEmails}
        onChange={(e) => setInviteEmails(e.target.value)}
        rows={8}
        className="font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Enter one email address per line. Each employee will receive an invitation to register and start their training.
      </p>
    </div>
    
    <div className="flex gap-3 justify-end">
      <Button
        onClick={onFinish}
        disabled={!inviteEmails.trim() || isLoading}
        size="lg"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Sending Invitations...
          </>
        ) : (
          <>
            Send Invitations
            <CheckCircle className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  </CardContent>
);
