import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  Users, 
  Mail, 
  Award, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BulkOperation {
  id: string;
  type: 'user_import' | 'email_blast' | 'certificate_batch' | 'role_assignment';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_items: number;
  processed_items: number;
  created_at: string;
  completed_at?: string;
  errors?: string[];
}

interface CSVData {
  firstName: string;
  lastName: string;
  email: string;
  organization?: string;
  role?: string;
}

export const EnhancedBulkOperations = () => {
  const { toast } = useToast();
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [bulkAssignmentEmails, setBulkAssignmentEmails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'text/csv') {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive"
      });
      return;
    }

    setCsvFile(file);
    
    // Parse CSV content
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data: CSVData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 3) { // At least firstName, lastName, email
        data.push({
          firstName: values[0],
          lastName: values[1],
          email: values[2],
          organization: values[3] || '',
          role: values[4] || 'student'
        });
      }
    }
    
    setCsvData(data);
    toast({
      title: "File Parsed",
      description: `Found ${data.length} valid user records`
    });
  };

  const processBulkUserImport = async () => {
    if (csvData.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload and parse a CSV file first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: 'user_import',
      status: 'processing',
      progress: 0,
      total_items: csvData.length,
      processed_items: 0,
      created_at: new Date().toISOString()
    };

    setOperations(prev => [...prev, newOperation]);

    let processed = 0;
    let errors: string[] = [];

    // Process each user
    for (const userData of csvData) {
      try {
        // Check if user already exists by querying auth.users
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
          errors.push(`Failed to check existing users: ${listError.message}`);
          continue;
        }

        const existingUser = users?.users?.find((u: any) => u.email === userData.email);

        if (!existingUser) {
          // Create user account via auth
          const { error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: 'TempPass123!', // User will need to reset
            user_metadata: {
              first_name: userData.firstName,
              last_name: userData.lastName
            }
          });

          if (authError) {
            errors.push(`Failed to create user ${userData.email}: ${authError.message}`);
            continue;
          }
        }

        processed++;
        const progress = Math.round((processed / csvData.length) * 100);
        
        setOperations(prev => prev.map(op => 
          op.id === newOperation.id 
            ? { ...op, progress, processed_items: processed }
            : op
        ));

        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        errors.push(`Error processing ${userData.email}: ${error.message}`);
      }
    }

    setOperations(prev => prev.map(op => 
      op.id === newOperation.id 
        ? { 
            ...op, 
            status: errors.length > 0 ? 'completed' : 'completed',
            completed_at: new Date().toISOString(),
            errors
          }
        : op
    ));

    setIsProcessing(false);
    setCsvData([]);
    setCsvFile(null);
    
    toast({
      title: "Import Complete",
      description: `Processed ${processed} users with ${errors.length} errors`
    });
  };

  const sendBulkEmail = async () => {
    if (!emailSubject || !emailContent) {
      toast({
        title: "Missing Information",
        description: "Please provide email subject and content",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get all users to send emails to
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .not('user_id', 'is', null);

      if (error) throw error;

      // Queue notifications for all users
      const notifications = profiles?.map(profile => ({
        user_id: profile.user_id,
        recipient_email: '', // Will be filled by the notification system
        subject: emailSubject,
        message: emailContent.replace('{firstName}', profile.first_name || ''),
        scheduled_for: new Date().toISOString(),
        priority: 'medium' as const,
        metadata: {
          type: 'bulk_email',
          campaign_id: Date.now().toString()
        }
      })) || [];

      if (notifications.length > 0) {
        const { error: queueError } = await supabase
          .from('notification_queue')
          .insert(notifications);

        if (queueError) throw queueError;
      }

      toast({
        title: "Emails Queued",
        description: `Queued ${notifications.length} email notifications`
      });

      setEmailSubject('');
      setEmailContent('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to queue emails: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processBulkRoleAssignment = async () => {
    if (!selectedRole || !bulkAssignmentEmails) {
      toast({
        title: "Missing Information", 
        description: "Please provide role and email addresses",
        variant: "destructive"
      });
      return;
    }

    const emails = bulkAssignmentEmails.split('\n').filter(email => email.trim());
    setIsProcessing(true);

    let processed = 0;
    let errors: string[] = [];

    for (const email of emails) {
      try {
        // Get user by email from auth.users 
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) throw authError;

        const user = authUsers?.users?.find((u: any) => u.email === email.trim());
        if (!user) {
          errors.push(`User not found: ${email}`);
          continue;
        }

        // Add role using the manage_user_role function
        const { error: roleError } = await supabase
          .rpc('manage_user_role', {
            target_user_id: user.id,
            new_role: selectedRole as any,
            action: 'add'
          });

        if (roleError) {
          errors.push(`Failed to assign role to ${email}: ${roleError.message}`);
        } else {
          processed++;
        }
      } catch (error: any) {
        errors.push(`Error processing ${email}: ${error.message}`);
      }
    }

    setIsProcessing(false);
    setBulkAssignmentEmails('');
    
    toast({
      title: "Role Assignment Complete",
      description: `Processed ${processed} users with ${errors.length} errors`
    });
  };

  const downloadSampleCsv = () => {
    const csvContent = "firstName,lastName,email,organization,role\nJohn,Doe,john@example.com,Acme Dispensary,student\nJane,Smith,jane@example.com,Green Leaf,dispensary_manager";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_users.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Enhanced Bulk Operations</h2>
        <Button onClick={downloadSampleCsv} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Sample CSV
        </Button>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Import</TabsTrigger>
          <TabsTrigger value="emails">Email Campaigns</TabsTrigger>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Enhanced User Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload CSV File (firstName, lastName, email, organization, role)
                </label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="mb-2"
                />
                {csvFile && csvData.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Parsed {csvData.length} records:</p>
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {csvData.slice(0, 5).map((user, index) => (
                        <p key={index} className="text-xs text-muted-foreground">
                          {user.firstName} {user.lastName} - {user.email}
                        </p>
                      ))}
                      {csvData.length > 5 && (
                        <p className="text-xs text-muted-foreground">...and {csvData.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={processBulkUserImport}
                disabled={csvData.length === 0 || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import {csvData.length} Users
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Enhanced Email Campaign
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Content (use {'{firstName}'} for personalization)
                </label>
                <Textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Dear {firstName},&#10;&#10;Your message here..."
                  rows={6}
                />
              </div>

              <Button 
                onClick={sendBulkEmail}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Queue Bulk Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Enhanced Role Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Role to Assign</label>
                <Select onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="dispensary_manager">Dispensary Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Addresses (one per line)
                </label>
                <Textarea
                  value={bulkAssignmentEmails}
                  onChange={(e) => setBulkAssignmentEmails(e.target.value)}
                  placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
                  rows={6}
                />
              </div>

              <Button 
                onClick={processBulkRoleAssignment}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Assign Roles
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Operations */}
      {operations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operations.map((operation) => (
                <div key={operation.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium capitalize">
                      {operation.type.replace('_', ' ')}
                    </span>
                    <Badge 
                      variant={operation.status === 'completed' ? 'default' : 
                              operation.status === 'failed' ? 'destructive' : 'secondary'}
                    >
                      {operation.status}
                    </Badge>
                  </div>
                  <Progress value={operation.progress} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {operation.processed_items} of {operation.total_items} items processed
                  </p>
                  {operation.errors && operation.errors.length > 0 && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded">
                      <p className="text-sm text-destructive font-medium">
                        {operation.errors.length} errors occurred
                      </p>
                      <div className="max-h-20 overflow-y-auto">
                        {operation.errors.slice(0, 3).map((error, index) => (
                          <p key={index} className="text-xs text-destructive">
                            {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};