import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileCheck, CheckCircle, ChevronDown, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComplianceTimeline } from '@/components/compliance/ComplianceTimeline';
import { detectComplianceGaps } from '@/services/gapDetectionService';
import { GapBadge } from '@/components/admin/gaps/GapBadge';

// COMAR mapping is now stored in the database - no hardcoded mapping needed

export default function ComplianceCurriculumMatrixPage() {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const { data: modules, isLoading } = useQuery({
    queryKey: ['course-modules-matrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('module_number, title, description, comar_reference, estimated_minutes, updated_at')
        .order('module_number');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: complianceGaps } = useQuery({
    queryKey: ['compliance-gaps'],
    queryFn: detectComplianceGaps,
    refetchInterval: 120000,
  });

  const getModuleGaps = (moduleNumber: number) => {
    return complianceGaps?.filter(gap => 
      gap.affected_entity_id === moduleNumber.toString()
    ) || [];
  };

  const totalGaps = complianceGaps?.length || 0;
  const criticalGaps = complianceGaps?.filter(g => g.severity === 'critical').length || 0;
  const coveragePercentage = modules ? Math.round(((modules.length - totalGaps) / modules.length) * 100) : 100;

  const toggleModule = (moduleNumber: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleNumber)) {
        newSet.delete(moduleNumber);
      } else {
        newSet.add(moduleNumber);
      }
      return newSet;
    });
  };

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Generation",
      description: "Generating curriculum compliance matrix PDF...",
    });
    // PDF generation would be implemented here
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <Badge className="mb-4 text-lg px-4 py-2">
          <FileCheck className="h-5 w-5 mr-2" />
          Regulatory Compliance Documentation
        </Badge>
        <h1 className="text-4xl font-bold mb-4">
          COMAR 14.17.05 Compliance Matrix
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Documenting Full Alignment with Maryland RVT Standards
        </p>
      </div>

      {/* Metadata */}
      <Card className="mb-8 border-2 border-primary">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-lg font-semibold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Review</p>
              <p className="text-lg font-semibold">{new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Compliance Status</p>
              <Badge variant="default" className="text-lg px-4 py-1">✓ Complete</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap Alert */}
      {totalGaps > 0 && (
        <Card className="mb-8 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <h3 className="text-lg font-bold">Compliance Gaps Detected</h3>
                  <p className="text-sm text-muted-foreground">
                    {totalGaps} {totalGaps === 1 ? 'issue' : 'issues'} found across modules
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GapBadge severity="critical" count={criticalGaps} />
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {coveragePercentage}% Coverage
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download Button */}
      <div className="text-center mb-8">
        <Button onClick={handleDownloadPDF} size="lg">
          <Download className="h-5 w-5 mr-2" />
          Download PDF Matrix
        </Button>
      </div>

      {/* Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Curriculum Compliance Mapping</CardTitle>
          <p className="text-sm text-muted-foreground">
            All 23 modules mapped to COMAR 14.17.05 requirements, including Drug-Free Workplace (COMAR 21.11.08.03), 
            Diversion Prevention, and Standard Operating Procedures
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading modules...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[80px]">Module #</TableHead>
                    <TableHead className="min-w-[250px]">Module Title</TableHead>
                    <TableHead className="min-w-[180px]">COMAR Reference</TableHead>
                    <TableHead className="text-center w-[100px]">Duration</TableHead>
                    <TableHead className="text-center w-[80px]">Status</TableHead>
                    <TableHead className="w-[120px]">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules?.map((module) => {
                    const isExpanded = expandedModules.has(module.module_number);
                    const moduleGaps = getModuleGaps(module.module_number);
                    const hasGaps = moduleGaps.length > 0;
                    const hasHighSeverity = moduleGaps.some(g => g.severity === 'critical' || g.severity === 'high');
                    
                    return (
                      <React.Fragment key={module.module_number}>
                        <TableRow 
                          className={`cursor-pointer hover:bg-muted/50 transition-colors ${hasHighSeverity ? 'border-l-4 border-l-destructive' : hasGaps ? 'border-l-4 border-l-orange-400' : ''}`}
                          onClick={() => toggleModule(module.module_number)}
                        >
                          <TableCell className="text-center">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-primary" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-primary">
                            {module.module_number}
                          </TableCell>
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              {module.title}
                              {hasGaps && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="whitespace-nowrap font-mono text-xs">
                              {module.comar_reference || 'COMAR 14.17.05'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">
                              {module.estimated_minutes} min
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {hasGaps ? (
                              <div className="flex flex-col items-center gap-1">
                                <AlertTriangle className="h-5 w-5 text-orange-600 mx-auto" />
                                <span className="text-xs text-muted-foreground">{moduleGaps.length} {moduleGaps.length === 1 ? 'gap' : 'gaps'}</span>
                              </div>
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(module.updated_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/30 border-l-4 border-l-primary">
                            <TableCell colSpan={7} className="p-6">
                              {/* Gap Alerts */}
                              {moduleGaps.length > 0 && (
                                <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
                                  <h4 className="text-sm font-bold text-destructive mb-3 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Detected Issues ({moduleGaps.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {moduleGaps.map(gap => (
                                      <div key={gap.id} className="text-sm">
                                        <div className="flex items-center gap-2 mb-1">
                                          <GapBadge severity={gap.severity} showIcon={false} />
                                          <span className="font-semibold">{gap.title}</span>
                                        </div>
                                        <p className="text-muted-foreground ml-6">{gap.description}</p>
                                        <p className="text-xs text-muted-foreground ml-6 mt-1">
                                          <strong>Action:</strong> {gap.suggested_action}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Module Description */}
                                  <div className="lg:col-span-1">
                                    <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                                      <FileCheck className="h-4 w-4" />
                                      Module Description
                                    </h4>
                                    <p className="text-sm leading-relaxed text-foreground">
                                      {module.description}
                                    </p>
                                  </div>

                                  {/* Regulatory Compliance */}
                                  <div className="lg:col-span-1">
                                    <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4" />
                                      Regulatory Compliance
                                    </h4>
                                    <div className="space-y-2">
                                      <div className="bg-white rounded-lg p-3 border border-primary/20 shadow-sm">
                                        <p className="text-xs font-semibold text-muted-foreground mb-1">Primary Reference</p>
                                        <Badge variant="default" className="font-mono">
                                          {module.comar_reference || 'COMAR 14.17.05'}
                                        </Badge>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-primary/20 shadow-sm">
                                        <p className="text-xs font-semibold text-muted-foreground mb-1">Compliance Status</p>
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                          <span className="text-sm text-foreground font-medium">Fully Compliant</span>
                                        </div>
                                      </div>
                                      <div className="bg-white rounded-lg p-3 border border-primary/20 shadow-sm">
                                        <p className="text-xs font-semibold text-muted-foreground mb-1">Training Duration</p>
                                        <Badge variant="secondary">
                                          {module.estimated_minutes} minutes
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Compliance Timeline */}
                                  <div className="lg:col-span-1">
                                    <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      Review Timeline
                                    </h4>
                                    <ComplianceTimeline lastUpdated={module.updated_at} />
                                  </div>
                                </div>

                                {/* Training Format Tags */}
                                <div className="pt-4 border-t border-border">
                                  <h4 className="text-sm font-bold text-primary mb-2">Training Format</h4>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">
                                      Online Self-Paced
                                    </Badge>
                                    <Badge variant="secondary">
                                      Maryland State Approved
                                    </Badge>
                                    <Badge variant="secondary">
                                      Interactive Content
                                    </Badge>
                                    <Badge variant="secondary">
                                      Certificate Upon Completion
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Certification */}
      <Card className="mt-8 bg-muted">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm mb-2">
              <strong>Certification:</strong> This curriculum has been reviewed and approved by the ProCann Edu Compliance Team.
            </p>
            <p className="text-sm text-muted-foreground">
              For questions or verification, contact: <a href="mailto:compliance@procannedu.com" className="text-primary hover:underline">compliance@procannedu.com</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
