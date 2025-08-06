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

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export const BulkOperationsManager = () => {
  const { toast } = useToast();
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [bulkAssignmentEmails, setBulkAssignmentEmails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const emailTemplates: EmailTemplate[] = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to ProCann Edu',
      content: 'Dear {firstName},\n\nWelcome to our cannabis education platform...',
      variables: ['firstName', 'lastName', 'organizationName']
    },
    {
      id: 'reminder',
      name: 'Training Reminder',
      subject: 'Complete Your Cannabis Training',
      content: 'Dear {firstName},\n\nThis is a reminder to complete your training modules...',
      variables: ['firstName', 'courseName', 'dueDate']
    },
    {
      id: 'expiry',
      name: 'Certificate Expiry',
      subject: 'Certificate Renewal Required',
      content: 'Dear {firstName},\n\nYour certificate expires on {expiryDate}...',
      variables: ['firstName', 'certificateNumber', 'expiryDate']
    }
  ];

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      toast({
        title: "File Selected",
        description: `Selected ${file.name} for bulk import`
      });
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive"
      });
    }
  };

  const processBulkUserImport = async () => {
    if (!csvFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file first",
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
      total_items: 100, // This would be calculated from CSV
      processed_items: 0,
      created_at: new Date().toISOString()
    };

    setOperations(prev => [...prev, newOperation]);

    // Simulate processing
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setOperations(prev => prev.map(op => 
        op.id === newOperation.id 
          ? { ...op, progress: i, processed_items: i }
          : op
      ));
    }

    setOperations(prev => prev.map(op => 
      op.id === newOperation.id 
        ? { ...op, status: 'completed', completed_at: new Date().toISOString() }
        : op
    ));

    setIsProcessing(false);
    toast({
      title: "Import Complete",
      description: "Bulk user import completed successfully"
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

    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: 'email_blast',
      status: 'processing',
      progress: 0,
      total_items: 250, // Number of recipients
      processed_items: 0,
      created_at: new Date().toISOString()
    };

    setOperations(prev => [...prev, newOperation]);

    // Simulate email sending
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setOperations(prev => prev.map(op => 
        op.id === newOperation.id 
          ? { ...op, progress: i, processed_items: Math.floor((i / 100) * 250) }
          : op
      ));
    }

    setOperations(prev => prev.map(op => 
      op.id === newOperation.id 
        ? { ...op, status: 'completed', completed_at: new Date().toISOString() }
        : op
    ));

    setIsProcessing(false);
    toast({
      title: "Emails Sent",
      description: "Bulk email campaign completed successfully"
    });
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

    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: 'role_assignment',
      status: 'processing',
      progress: 0,
      total_items: emails.length,
      processed_items: 0,
      created_at: new Date().toISOString()
    };

    setOperations(prev => [...prev, newOperation]);

    // Simulate role assignment
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setOperations(prev => prev.map(op => 
        op.id === newOperation.id 
          ? { ...op, progress: i, processed_items: Math.floor((i / 100) * emails.length) }
          : op
      ));
    }

    setOperations(prev => prev.map(op => 
      op.id === newOperation.id 
        ? { ...op, status: 'completed', completed_at: new Date().toISOString() }
        : op
    ));

    setIsProcessing(false);
    toast({
      title: "Roles Assigned",
      description: `Successfully assigned ${selectedRole} role to ${emails.length} users`
    });
  };

  const generateCertificateBatch = async () => {
    setIsProcessing(true);

    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: 'certificate_batch',
      status: 'processing',
      progress: 0,
      total_items: 75, // Number of certificates to generate
      processed_items: 0,
      created_at: new Date().toISOString()
    };

    setOperations(prev => [...prev, newOperation]);

    // Simulate certificate generation
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 400));
      setOperations(prev => prev.map(op => 
        op.id === newOperation.id 
          ? { ...op, progress: i, processed_items: Math.floor((i / 100) * 75) }
          : op
      ));
    }

    setOperations(prev => prev.map(op => 
      op.id === newOperation.id 
        ? { ...op, status: 'completed', completed_at: new Date().toISOString() }
        : op
    ));

    setIsProcessing(false);
    toast({
      title: "Certificates Generated",
      description: "Bulk certificate generation completed successfully"
    });
  };

  const downloadSampleCsv = () => {
    const csvContent = "firstName,lastName,email,organization,role\nJohn,Doe,john@example.com,Acme Dispensary,student\nJane,Smith,jane@example.com,Green Leaf,manager";
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

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'user_import': return <Users className="h-4 w-4" />;
      case 'email_blast': return <Mail className="h-4 w-4" />;
      case 'certificate_batch': return <Award className="h-4 w-4" />;
      case 'role_assignment': return <Users className="h-4 w-4" />;
      default: return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Bulk Operations Manager</h2>
        <Button onClick={downloadSampleCsv} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Sample CSV
        </Button>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">User Import</TabsTrigger>
          <TabsTrigger value="emails">Email Campaigns</TabsTrigger>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Bulk User Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload CSV File
                </label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="mb-2"
                />
                {csvFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {csvFile.name}
                  </p>
                )}
              </div>
              
              <Button 
                onClick={processBulkUserImport}
                disabled={!csvFile || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import Users
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Bulk Email Campaign
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Template
                </label>
                <Select onValueChange={(value) => {
                  const template = emailTemplates.find(t => t.id === value);
                  if (template) {
                    setEmailSubject(template.subject);
                    setEmailContent(template.content);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject
                </label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Content
                </label>
                <Textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Email content"
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
                Send Bulk Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Bulk Role Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Role to Assign
                </label>
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

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Bulk Certificate Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Generate certificates for all users who have completed their training but haven't received certificates yet.
              </p>
              
              <Button 
                onClick={generateCertificateBatch}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Award className="h-4 w-4 mr-2" />
                )}
                Generate Certificates
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Operations History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {operations.map(operation => (
              <div key={operation.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getOperationIcon(operation.type)}
                    <span className="font-medium capitalize">
                      {operation.type.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge className={getStatusColor(operation.status)}>
                    {operation.status === 'processing' && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {operation.status === 'completed' && (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {operation.status === 'failed' && (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {operation.status}
                  </Badge>
                </div>
                
                {operation.status === 'processing' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{operation.processed_items} / {operation.total_items}</span>
                    </div>
                    <Progress value={operation.progress} className="h-2" />
                  </div>
                )}
                
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>Started: {new Date(operation.created_at).toLocaleString()}</span>
                  {operation.completed_at && (
                    <span>Completed: {new Date(operation.completed_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
            
            {operations.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No operations yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};