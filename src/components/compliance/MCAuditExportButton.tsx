import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { FileDown, Loader2, FileText, Shield, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

interface MCAuditExportButtonProps {
  organizationId: string;
  organizationName?: string;
}

export const MCAuditExportButton = ({ organizationId, organizationName }: MCAuditExportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 365), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [includeIncidents, setIncludeIncidents] = useState(true);
  const [includeAttestations, setIncludeAttestations] = useState(true);
  const [includeTrainerCerts, setIncludeTrainerCerts] = useState(true);
  const [saveToStorage, setSaveToStorage] = useState(true);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-mca-audit-report', {
        body: {
          organization_id: organizationId,
          start_date: startDate,
          end_date: endDate,
          include_incidents: includeIncidents,
          include_attestations: includeAttestations,
          include_trainer_certs: includeTrainerCerts
        }
      });

      if (error) throw error;

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const fileName = `MCA_Audit_Report_${organizationName || 'Organization'}_${timestamp}.json`;
      const reportJson = JSON.stringify(data, null, 2);

      // Save to storage if enabled
      if (saveToStorage) {
        try {
          const storagePath = `org/${organizationId}/audit-reports/${timestamp}.json`;
          
          const { error: uploadError } = await supabase.storage
            .from('compliance')
            .upload(storagePath, reportJson, {
              contentType: 'application/json',
              upsert: false,
            });

          if (!uploadError) {
            // Track in compliance_packets table
            const supabaseAny = supabase as any;
            await supabaseAny
              .from('compliance_packets')
              .insert({
                organization_id: organizationId,
                packet_type: 'organization',
                storage_path: storagePath,
                file_name: fileName,
                created_by: (await supabase.auth.getUser()).data.user?.id,
                metadata: {
                  report_type: 'mca_audit',
                  start_date: startDate,
                  end_date: endDate,
                  include_incidents: includeIncidents,
                  include_attestations: includeAttestations,
                  include_trainer_certs: includeTrainerCerts,
                },
              });
          }
        } catch (storageError) {
          console.warn('Failed to save to storage, continuing with download:', storageError);
        }
      }

      // Create a downloadable JSON file
      const blob = new Blob([reportJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Audit report generated successfully', {
        description: saveToStorage ? 'Report saved to compliance storage' : undefined,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Failed to generate report: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          MCA Audit Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate MCA Audit Report
          </DialogTitle>
          <DialogDescription>
            Export a comprehensive compliance report for MCA auditors
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Include in Report</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="incidents" 
                  checked={includeIncidents}
                  onCheckedChange={(checked) => setIncludeIncidents(!!checked)}
                />
                <label htmlFor="incidents" className="text-sm">
                  Compliance Incidents & Remediation
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="attestations" 
                  checked={includeAttestations}
                  onCheckedChange={(checked) => setIncludeAttestations(!!checked)}
                />
                <label htmlFor="attestations" className="text-sm">
                  Module Attestations
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="trainers" 
                  checked={includeTrainerCerts}
                  onCheckedChange={(checked) => setIncludeTrainerCerts(!!checked)}
                />
                <label htmlFor="trainers" className="text-sm">
                  Trainer Certifications
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <Checkbox 
              id="saveToStorage" 
              checked={saveToStorage}
              onCheckedChange={(checked) => setSaveToStorage(!!checked)}
            />
            <label htmlFor="saveToStorage" className="text-sm flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              Save copy to compliance storage (audit trail)
            </label>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Report Contents:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Organization & license information</li>
              <li>• Complete employee training records</li>
              <li>• Certificate history with verification</li>
              <li>• Supervisor sign-offs with validity status</li>
              <li>• Retraining events & invalidation history</li>
              <li>• Scheduled compliance reviews</li>
              <li>• COMAR version alignment proof</li>
            </ul>
          </div>

          <Button 
            className="w-full" 
            onClick={handleExport}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Download Audit Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
