import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { IncidentReportForm } from './IncidentReportForm';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Plus, 
  Search,
  XCircle,
  Eye,
  GraduationCap,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Incident {
  id: string;
  incident_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  reported_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  employee_user_id: string | null;
  metadata: Record<string, any>;
}

interface RetrainingAssignment {
  id: string;
  module_id: string;
  status: string;
  due_date: string;
  completed_at: string | null;
  course_modules?: {
    title: string;
    module_number: number;
  };
}

interface IncidentTrackerProps {
  organizationId: string;
}

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusColors: Record<string, string> = {
  reported: 'bg-blue-100 text-blue-800',
  investigating: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const incidentTypeLabels: Record<string, string> = {
  customer_complaint: 'Customer Complaint',
  regulatory_violation: 'Regulatory Violation',
  diversion_concern: 'Diversion Concern',
  documentation_failure: 'Documentation Failure',
  id_verification_failure: 'ID Verification Failure',
  product_handling: 'Product Handling',
  safety_violation: 'Safety Violation',
};

export const IncidentTracker: React.FC<IncidentTrackerProps> = ({ organizationId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [retrainingAssignments, setRetrainingAssignments] = useState<RetrainingAssignment[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; email: string }>>([]);

  useEffect(() => {
    fetchIncidents();
    fetchEmployees();
  }, [organizationId]);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('compliance_incidents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('reported_at', { ascending: false });

      if (error) throw error;
      setIncidents((data as Incident[]) || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      toast({ title: 'Error', description: 'Failed to load incidents', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('organization_id', organizationId);

      if (error) throw error;
      setEmployees(
        (data || []).map((p: any) => ({
          id: p.user_id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
          email: '',
        }))
      );
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchRetrainingForIncident = async (incidentId: string) => {
    try {
      const { data, error } = await supabase
        .from('incident_retraining_assignments')
        .select(`
          id,
          module_id,
          status,
          due_date,
          completed_at,
          course_modules (
            title,
            module_number
          )
        `)
        .eq('incident_id', incidentId);

      if (error) throw error;
      setRetrainingAssignments((data as any) || []);
    } catch (error) {
      console.error('Error fetching retraining:', error);
    }
  };

  const updateIncidentStatus = async (incidentId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'resolved' || newStatus === 'closed') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
        if (resolutionNotes) {
          updateData.resolution_notes = resolutionNotes;
        }
      }

      const { error } = await supabase
        .from('compliance_incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;

      toast({ title: 'Success', description: `Incident marked as ${newStatus}` });
      fetchIncidents();
      setSelectedIncident(null);
      setResolutionNotes('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
    const matchesSearch = 
      searchQuery === '' ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incidentTypeLabels[incident.incident_type]?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter((i) => i.status === 'reported' || i.status === 'investigating').length,
    critical: incidents.filter((i) => i.severity === 'critical' && i.status !== 'closed').length,
    resolved: incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.critical}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reported">Reported</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchIncidents}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <IncidentReportForm
                organizationId={organizationId}
                employees={employees}
                onSuccess={() => {
                  setShowReportForm(false);
                  fetchIncidents();
                }}
                onCancel={() => setShowReportForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Incidents</CardTitle>
          <CardDescription>Track and manage compliance incidents and retraining assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading incidents...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {incidents.length === 0 ? 'No incidents reported yet' : 'No incidents match your filters'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(incident.reported_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{incidentTypeLabels[incident.incident_type] || incident.incident_type}</TableCell>
                    <TableCell>
                      <Badge className={severityColors[incident.severity]}>
                        {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[incident.status]}>
                        {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{incident.description}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedIncident(incident);
                              fetchRetrainingForIncident(incident.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Incident Details</DialogTitle>
                            <DialogDescription>
                              Reported on {format(new Date(incident.reported_at), 'MMMM d, yyyy h:mm a')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Type</p>
                                <p>{incidentTypeLabels[incident.incident_type]}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Severity</p>
                                <Badge className={severityColors[incident.severity]}>{incident.severity}</Badge>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Description</p>
                              <p className="mt-1">{incident.description}</p>
                            </div>
                            {incident.resolution_notes && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Resolution Notes</p>
                                <p className="mt-1">{incident.resolution_notes}</p>
                              </div>
                            )}

                            {/* Retraining Assignments */}
                            {retrainingAssignments.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                  <GraduationCap className="h-4 w-4" />
                                  Assigned Retraining
                                </p>
                                <div className="space-y-2">
                                  {retrainingAssignments.map((rt) => (
                                    <div key={rt.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                      <span>
                                        Module {rt.course_modules?.module_number}: {rt.course_modules?.title}
                                      </span>
                                      <Badge variant={rt.completed_at ? 'default' : 'outline'}>
                                        {rt.completed_at ? 'Completed' : rt.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Status Update */}
                            {incident.status !== 'closed' && (
                              <div className="border-t pt-4">
                                <p className="text-sm font-medium mb-2">Update Status</p>
                                {(incident.status === 'reported' || incident.status === 'investigating') && (
                                  <div className="space-y-2">
                                    <Textarea
                                      placeholder="Resolution notes (optional)"
                                      value={resolutionNotes}
                                      onChange={(e) => setResolutionNotes(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      {incident.status === 'reported' && (
                                        <Button
                                          variant="outline"
                                          onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                                        >
                                          Mark Investigating
                                        </Button>
                                      )}
                                      <Button onClick={() => updateIncidentStatus(incident.id, 'resolved')}>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark Resolved
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {incident.status === 'resolved' && (
                                  <Button onClick={() => updateIncidentStatus(incident.id, 'closed')}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Close Incident
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
