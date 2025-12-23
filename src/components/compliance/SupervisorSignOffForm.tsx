import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface SupervisorSignOffFormProps {
  organizationId: string;
  employees: Employee[];
  competencyAreas?: string[];
  onSuccess?: () => void;
}

const DEFAULT_COMPETENCY_AREAS = [
  { id: 'id_verification', label: 'ID Verification' },
  { id: 'product_knowledge', label: 'Product Knowledge' },
  { id: 'compliance_protocols', label: 'Compliance Protocols' },
  { id: 'customer_service', label: 'Customer Service' },
  { id: 'diversion_prevention', label: 'Diversion Prevention' },
  { id: 'safety_procedures', label: 'Safety Procedures' },
  { id: 'inventory_management', label: 'Inventory Management' },
  { id: 'pos_operations', label: 'POS Operations' },
];

export const SupervisorSignOffForm = ({ 
  organizationId, 
  employees, 
  competencyAreas,
  onSuccess 
}: SupervisorSignOffFormProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isFloorObservation, setIsFloorObservation] = useState(false);
  const [observationDate, setObservationDate] = useState('');

  const queryClient = useQueryClient();

  const availableAreas = competencyAreas 
    ? DEFAULT_COMPETENCY_AREAS.filter(a => competencyAreas.includes(a.id))
    : DEFAULT_COMPETENCY_AREAS;

  const signOffMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create sign-off records for each selected competency
      const signoffs = selectedCompetencies.map(competency => ({
        employee_user_id: selectedEmployee,
        supervisor_user_id: user?.id,
        organization_id: organizationId,
        competency_area: competency,
        notes,
        is_floor_observation: isFloorObservation,
        observation_date: isFloorObservation && observationDate ? observationDate : null
      }));

      const { error } = await supabase
        .from('supervisor_signoffs')
        .insert(signoffs);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor-signoffs'] });
      toast.success('Sign-offs recorded successfully');
      resetForm();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to record sign-offs: ${error.message}`);
    }
  });

  const resetForm = () => {
    setSelectedEmployee('');
    setSelectedCompetencies([]);
    setNotes('');
    setIsFloorObservation(false);
    setObservationDate('');
  };

  const toggleCompetency = (competencyId: string) => {
    setSelectedCompetencies(prev => 
      prev.includes(competencyId)
        ? prev.filter(c => c !== competencyId)
        : [...prev, competencyId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Supervisor Sign-Off
        </CardTitle>
        <CardDescription>
          Verify employee competency through observation and sign-off
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Employee
          </Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Select an employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.user_id} value={emp.user_id}>
                  {emp.first_name} {emp.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Competency Areas */}
        <div className="space-y-2">
          <Label>Competency Areas Verified</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableAreas.map((area) => (
              <div 
                key={area.id}
                className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                  selectedCompetencies.includes(area.id) 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => toggleCompetency(area.id)}
              >
                <Checkbox 
                  checked={selectedCompetencies.includes(area.id)}
                  onCheckedChange={() => toggleCompetency(area.id)}
                />
                <label className="text-sm cursor-pointer">{area.label}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Floor Observation */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="floor-observation"
              checked={isFloorObservation}
              onCheckedChange={(checked) => setIsFloorObservation(!!checked)}
            />
            <label htmlFor="floor-observation" className="text-sm font-medium">
              Floor Observation Completed
            </label>
          </div>
          
          {isFloorObservation && (
            <div className="pl-6 space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Observation Date
              </Label>
              <Input 
                type="date"
                value={observationDate}
                onChange={(e) => setObservationDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes & Observations</Label>
          <Textarea
            placeholder="Document any specific observations, areas of strength, or recommendations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full"
          onClick={() => signOffMutation.mutate()}
          disabled={!selectedEmployee || selectedCompetencies.length === 0 || signOffMutation.isPending}
        >
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Record Sign-Off ({selectedCompetencies.length} competencies)
        </Button>
      </CardContent>
    </Card>
  );
};
