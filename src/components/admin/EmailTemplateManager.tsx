import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Edit, Eye, Save, X, FileText, AlertCircle, CheckCircle, History } from 'lucide-react';
import { sanitizeHtml } from '@/utils/sanitize-html';

interface EmailTemplate {
  id: string;
  template_name: string;
  subject_line: string;
  html_content: string;
  variables: any;
  version: number;
  is_active: boolean;
  last_tested_at?: string;
  created_at: string;
  updated_at: string;
}

interface TemplateHistory {
  id: string;
  version: number;
  html_content: string;
  subject_line: string;
  created_at: string;
}

export const EmailTemplateManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editing, setEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [history, setHistory] = useState<TemplateHistory[]>([]);
  const [editedContent, setEditedContent] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const { toast } = useToast();

  // Sanitize preview content
  const sanitizedPreview = useMemo(
    () => selectedTemplate?.html_content ? sanitizeHtml(selectedTemplate.html_content) : '',
    [selectedTemplate?.html_content]
  );

  useEffect(() => {
    fetchTemplates();

    const channel = supabase
      .channel('template-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_templates' }, () => {
        fetchTemplates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_name');

    if (data) {
      setTemplates(data);
    }
  };

  const fetchHistory = async (templateId: string) => {
    const { data } = await supabase
      .from('email_template_history')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (data) {
      setHistory(data);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedContent(template.html_content);
    setEditedSubject(template.subject_line);
    setEditing(true);
    setPreviewMode(false);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
    setEditing(false);
  };

  const handleHistory = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setHistoryMode(true);
    await fetchHistory(template.id);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          html_content: editedContent,
          subject_line: editedSubject,
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;

      toast({
        title: 'Template Saved',
        description: `${selectedTemplate.template_name} updated successfully`,
      });

      setEditing(false);
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save template changes',
        variant: 'destructive',
      });
    }
  };

  const migrateTemplates = async () => {
    try {
      setIsMigrating(true);
      const { data, error } = await supabase.functions.invoke("migrate-email-templates");

      if (error) throw error;

      toast({
        title: "Migration Complete",
        description: data.message || "Templates migrated successfully",
      });

      fetchTemplates();
    } catch (error: any) {
      console.error("Error migrating templates:", error);
      toast({
        title: "Migration Error",
        description: error.message || "Failed to migrate templates",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const testTemplate = async (template: EmailTemplate) => {
    try {
      toast({
        title: 'Testing Template',
        description: 'Sending test email...',
      });

      const { error } = await supabase.functions.invoke('render-template-preview', {
        body: { template_id: template.id, test: true }
      });

      if (error) throw error;

      await supabase
        .from('email_templates')
        .update({ last_tested_at: new Date().toISOString() })
        .eq('id', template.id);

      toast({
        title: 'Test Sent',
        description: 'Check your email inbox',
      });

      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Could not send test email',
        variant: 'destructive',
      });
    }
  };

  const validateTemplate = (content: string, variables: string[]) => {
    const issues: string[] = [];
    
    // Check for unreplaced variables
    const varMatches = content.match(/\{\{\s*\.\w+\s*\}\}/g) || [];
    const foundVars = varMatches.map(v => v.replace(/\{\{\s*\.(\w+)\s*\}\}/, '$1'));
    
    foundVars.forEach(v => {
      if (!variables.includes(v)) {
        issues.push(`Unknown variable: ${v}`);
      }
    });

    // Check for broken image tags
    if (content.includes('<img') && !content.includes('alt=')) {
      issues.push('Images missing alt text');
    }

    return issues;
  };

  const getTemplateHealth = (template: EmailTemplate) => {
    const issues = validateTemplate(template.html_content, template.variables);
    return issues.length === 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">
            Manage and customize email templates
          </p>
        </div>
        <Button onClick={migrateTemplates} disabled={isMigrating}>
          {isMigrating ? "Migrating..." : "🔄 Migrate Templates from Files"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Templates</CardTitle>
          <CardDescription>All email templates used by the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {template.template_name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    v{template.version} • Updated {new Date(template.updated_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getTemplateHealth(template) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.subject_line}
                    </p>

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(template)}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePreview(template)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleHistory(template)}>
                        <History className="h-3 w-3 mr-1" />
                        History
                      </Button>
                    </div>

                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => testTemplate(template)}
                    >
                      Send Test Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Template: {selectedTemplate?.template_name}</DialogTitle>
            <DialogDescription>
              Make changes to the template HTML and subject line
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto">
            <div>
              <label className="text-sm font-medium">Subject Line</label>
              <Input
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">HTML Content</label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={20}
                className="font-mono text-xs"
                placeholder="HTML content..."
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate?.variables.map((v) => (
                  <Badge key={v} variant="outline">
                    {`{{ .${v} }}`}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview: {selectedTemplate?.template_name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.subject_line}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 overflow-y-auto max-h-[70vh]">
            <div dangerouslySetInnerHTML={{ __html: sanitizedPreview }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyMode} onOpenChange={setHistoryMode}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History: {selectedTemplate?.template_name}</DialogTitle>
            <DialogDescription>Previous versions of this template</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {history.map((h) => (
              <Card key={h.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Version {h.version}</CardTitle>
                  <CardDescription>
                    {new Date(h.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{h.subject_line}</p>
                </CardContent>
              </Card>
            ))}
            {history.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No history available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};