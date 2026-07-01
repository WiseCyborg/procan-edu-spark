import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, History, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { GHOST_COURSE_IDS_PG_LIST } from '@/lib/ghostCourses';

interface CurriculumVersion {
  id: string;
  course_id: string;
  version_number: string;
  effective_date: string;
  changelog: string | null;
  is_active: boolean;
  created_at: string;
  courses?: {
    title: string;
  };
}

export const CurriculumVersionManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [versionNumber, setVersionNumber] = useState('');
  const [changelog, setChangelog] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  
  const queryClient = useQueryClient();

  const { data: courses } = useQuery({
    queryKey: ['courses-for-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: versions, isLoading } = useQuery({
    queryKey: ['curriculum-versions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_versions')
        .select(`
          *,
          courses (title)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CurriculumVersion[];
    }
  });

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Deactivate previous versions for this course
      await supabase
        .from('curriculum_versions')
        .update({ is_active: false })
        .eq('course_id', selectedCourse);

      const { error } = await supabase
        .from('curriculum_versions')
        .insert({
          course_id: selectedCourse,
          version_number: versionNumber,
          effective_date: effectiveDate,
          changelog,
          is_active: true,
          created_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-versions'] });
      toast.success('New curriculum version created');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create version: ${error.message}`);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive, courseId }: { id: string; isActive: boolean; courseId: string }) => {
      if (isActive) {
        // Deactivate other versions for this course first
        await supabase
          .from('curriculum_versions')
          .update({ is_active: false })
          .eq('course_id', courseId);
      }

      const { error } = await supabase
        .from('curriculum_versions')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-versions'] });
      toast.success('Version status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  const resetForm = () => {
    setSelectedCourse('');
    setVersionNumber('');
    setChangelog('');
    setEffectiveDate('');
  };

  // Group versions by course
  const versionsByCourse = versions?.reduce((acc, version) => {
    const courseTitle = version.courses?.title || 'Unknown Course';
    if (!acc[courseTitle]) {
      acc[courseTitle] = [];
    }
    acc[courseTitle].push(version);
    return acc;
  }, {} as Record<string, CurriculumVersion[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Curriculum Version Control
            </CardTitle>
            <CardDescription>
              Track and manage curriculum versions for COMAR compliance
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Curriculum Version</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Version Number</Label>
                  <Input 
                    placeholder="e.g., 2024.1.0" 
                    value={versionNumber}
                    onChange={(e) => setVersionNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective Date</Label>
                  <Input 
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Changelog</Label>
                  <Textarea 
                    placeholder="Describe the changes in this version..."
                    value={changelog}
                    onChange={(e) => setChangelog(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createVersionMutation.mutate()}
                  disabled={!selectedCourse || !versionNumber || !effectiveDate || createVersionMutation.isPending}
                >
                  Create Version
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading versions...</p>
        ) : !versionsByCourse || Object.keys(versionsByCourse).length === 0 ? (
          <p className="text-muted-foreground">No curriculum versions found. Create your first version to start tracking.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(versionsByCourse).map(([courseTitle, courseVersions]) => (
              <div key={courseTitle} className="space-y-2">
                <h4 className="font-semibold text-sm">{courseTitle}</h4>
                <div className="space-y-2">
                  {courseVersions.map((version) => (
                    <div 
                      key={version.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {version.is_active ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{version.version_number}</span>
                            {version.is_active && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Effective: {format(new Date(version.effective_date), 'MMM d, yyyy')}
                          </p>
                          {version.changelog && (
                            <p className="text-sm text-muted-foreground mt-1">{version.changelog}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant={version.is_active ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({
                          id: version.id,
                          isActive: !version.is_active,
                          courseId: version.course_id
                        })}
                      >
                        {version.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
