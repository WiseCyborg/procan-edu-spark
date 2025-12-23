import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, FileText, Send } from 'lucide-react';

const incidentTypes = [
  { value: 'customer_complaint', label: 'Customer Complaint' },
  { value: 'regulatory_violation', label: 'Regulatory Violation' },
  { value: 'diversion_concern', label: 'Diversion Concern' },
  { value: 'documentation_failure', label: 'Documentation Failure' },
  { value: 'id_verification_failure', label: 'ID Verification Failure' },
  { value: 'product_handling', label: 'Product Handling Issue' },
  { value: 'safety_violation', label: 'Safety Violation' },
] as const;

const severityLevels = [
  { value: 'low', label: 'Low', description: 'Minor issue, no immediate action required' },
  { value: 'medium', label: 'Medium', description: 'Requires attention within 48 hours' },
  { value: 'high', label: 'High', description: 'Requires immediate attention, retraining may be needed' },
  { value: 'critical', label: 'Critical', description: 'Immediate action required, regulatory risk' },
] as const;

const formSchema = z.object({
  incident_type: z.string().min(1, 'Please select an incident type'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  employee_user_id: z.string().optional(),
  description: z.string().min(20, 'Please provide at least 20 characters describing the incident'),
  metadata: z.object({
    location: z.string().optional(),
    witnesses: z.string().optional(),
    date_occurred: z.string().optional(),
  }).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface IncidentReportFormProps {
  organizationId: string;
  employees?: Array<{ id: string; name: string; email: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const IncidentReportForm: React.FC<IncidentReportFormProps> = ({
  organizationId,
  employees = [],
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      incident_type: '',
      severity: 'medium',
      employee_user_id: '',
      description: '',
      metadata: {
        location: '',
        witnesses: '',
        date_occurred: new Date().toISOString().split('T')[0],
      },
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the incident
      const { data: incident, error: incidentError } = await supabase
        .from('compliance_incidents')
        .insert({
          organization_id: organizationId,
          incident_type: data.incident_type,
          severity: data.severity,
          employee_user_id: data.employee_user_id || null,
          description: data.description,
          reported_by: user.id,
          metadata: data.metadata,
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      // If high or critical severity, trigger the retraining edge function
      if (data.severity === 'high' || data.severity === 'critical') {
        await supabase.functions.invoke('incident-retraining-trigger', {
          body: { 
            incidentId: incident.id,
            incidentType: data.incident_type,
            employeeUserId: data.employee_user_id,
            severity: data.severity,
          },
        });
      }

      toast({
        title: 'Incident Reported',
        description: data.severity === 'high' || data.severity === 'critical' 
          ? 'Incident logged and retraining has been automatically assigned.'
          : 'Incident has been logged successfully.',
      });

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error reporting incident:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to report incident',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Report Compliance Incident
        </CardTitle>
        <CardDescription>
          Document incidents for compliance tracking and trigger retraining if needed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="incident_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select incident type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incidentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {severityLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{level.label}</span>
                              <span className="text-xs text-muted-foreground">{level.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      High/Critical severity will auto-assign retraining
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {employees.length > 0 && (
              <FormField
                control={form.control}
                name="employee_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Involved (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None / Unknown</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the incident in detail. Include what happened, when, where, and any immediate actions taken..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="metadata.date_occurred"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Occurred</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metadata.location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sales floor, Back room" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metadata.witnesses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Witnesses</FormLabel>
                    <FormControl>
                      <Input placeholder="Names of any witnesses" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
