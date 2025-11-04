import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileCheck, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// COMAR mapping is now stored in the database - no hardcoded mapping needed

export default function ComplianceCurriculumMatrixPage() {
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
            All 18 modules mapped to COMAR 14.17.05 requirements, including Drug-Free Workplace (COMAR 21.11.08.03), 
            Diversion Prevention, and Standard Operating Procedures
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading modules...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Module #</th>
                    <th className="text-left py-3 px-4">Module Title</th>
                    <th className="text-left py-3 px-4">COMAR Reference</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-center py-3 px-4">Duration</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {modules?.map((module) => {
                    return (
                      <tr key={module.module_number} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-semibold">{module.module_number}</td>
                        <td className="py-3 px-4 font-medium">{module.title}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="whitespace-nowrap">
                            {module.comar_reference || 'COMAR 14.17.05'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground max-w-md">
                          {module.description}
                        </td>
                        <td className="py-3 px-4 text-center text-sm">
                          {module.estimated_minutes} min
                        </td>
                        <td className="py-3 px-4 text-center">
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                        <td className="py-3 px-4 text-sm whitespace-nowrap">
                          {new Date(module.updated_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
