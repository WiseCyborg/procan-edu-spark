import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Plus, Trash2, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';

const INCIDENT_TYPES = [
  { value: 'customer_complaint', label: 'Customer Complaint' },
  { value: 'regulatory_violation', label: 'Regulatory Violation' },
  { value: 'diversion_concern', label: 'Diversion Concern' },
  { value: 'documentation_failure', label: 'Documentation Failure' },
  { value: 'id_verification_failure', label: 'ID Verification Failure' },
  { value: 'product_handling', label: 'Product Handling Issue' },
  { value: 'safety_violation', label: 'Safety Violation' },
  { value: 'security', label: 'Security Incident' },
  { value: 'privacy', label: 'Privacy Breach' },
  { value: 'medical', label: 'Medical Emergency' },
];

interface Mapping {
  id: string;
  incident_type: string;
  module_id: string;
  module_title?: string;
}

interface Module {
  id: string;
  title: string;
  module_number: number;
}

interface IncidentModuleMappingAdminProps {
  organizationId: string;
}

export const IncidentModuleMappingAdmin: React.FC<IncidentModuleMappingAdminProps> = ({
  organizationId,
}) => {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newIncidentType, setNewIncidentType] = useState('');
  const [newModuleId, setNewModuleId] = useState('');

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Use RPC or direct fetch to avoid TS deep type issues
      const [mappingRes, moduleRes] = await Promise.all([
        supabase.rpc('get_incident_mappings_for_org', { org_id: organizationId }).then(r => r),
        supabase.from('course_modules').select('id, title, module_number').eq('is_active', true).order('module_number')
      ]);

      // Fallback: direct query if RPC doesn't exist
      let mappingData: Mapping[] = [];
      if (mappingRes.error?.code === 'PGRST202') {
        // RPC doesn't exist, use direct query with type assertion
        const directRes = await supabase
          .from('incident_module_mappings')
          .select('*')
          .eq('organization_id', organizationId);
        mappingData = (directRes.data || []) as unknown as Mapping[];
      } else if (!mappingRes.error) {
        mappingData = (mappingRes.data || []) as Mapping[];
      }

      const moduleData: Module[] = (moduleRes.data || []) as Module[];

      // Enrich mappings with module titles
      const enrichedMappings: Mapping[] = mappingData.map(m => ({
        ...m,
        module_title: moduleData.find(mod => mod.id === m.module_id)?.title || 'Unknown Module',
      }));

      setMappings(enrichedMappings);
      setModules(moduleData);
    } catch (error: unknown) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load mappings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newIncidentType || !newModuleId) {
      toast.error('Please select both an incident type and a module');
      return;
    }

    if (mappings.some(m => m.incident_type === newIncidentType)) {
      toast.error('A mapping for this incident type already exists');
      return;
    }

    setIsSaving(true);
    try {
      const insertData = {
        organization_id: organizationId,
        incident_type: newIncidentType,
        module_id: newModuleId,
      };
      
      const result = await supabase
        .from('incident_module_mappings')
        .insert(insertData)
        .select('id, incident_type, module_id')
        .single();

      if (result.error) throw result.error;

      const data = result.data as unknown as Mapping;
      const moduleTitle = modules.find(m => m.id === newModuleId)?.title || 'Unknown Module';
      setMappings([...mappings, { ...data, module_title: moduleTitle }]);
      setNewIncidentType('');
      setNewModuleId('');
      toast.success('Mapping added successfully');
    } catch (error: unknown) {
      console.error('Failed to add mapping:', error);
      toast.error('Failed to add mapping');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const result = await supabase
        .from('incident_module_mappings')
        .delete()
        .eq('id', mappingId);

      if (result.error) throw result.error;

      setMappings(mappings.filter(m => m.id !== mappingId));
      toast.success('Mapping removed');
    } catch (error: unknown) {
      console.error('Failed to delete mapping:', error);
      toast.error('Failed to remove mapping');
    }
  };

  const getIncidentLabel = (type: string) => {
    return INCIDENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const unmappedIncidentTypes = INCIDENT_TYPES.filter(
    t => !mappings.some(m => m.incident_type === t.value)
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Incident-to-Module Mapping
        </CardTitle>
        <CardDescription>
          Configure which training modules are automatically assigned when specific incident types are reported.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3 items-end p-4 bg-muted/50 rounded-lg">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Incident Type</label>
            <Select value={newIncidentType} onValueChange={setNewIncidentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                {unmappedIncidentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Retraining Module</label>
            <Select value={newModuleId} onValueChange={setNewModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map(module => (
                  <SelectItem key={module.id} value={module.id}>
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {module.module_number}. {module.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddMapping} disabled={isSaving || !newIncidentType || !newModuleId}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-2">Add</span>
          </Button>
        </div>

        {mappings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident Type</TableHead>
                <TableHead>Triggers Retraining</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map(mapping => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      {getIncidentLabel(mapping.incident_type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      <BookOpen className="h-3 w-3" />
                      {mapping.module_title}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No mappings configured</p>
            <p className="text-sm">Add mappings above to auto-assign retraining when incidents occur</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
