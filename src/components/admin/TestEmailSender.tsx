import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TestResult {
  name: string;
  status: 'success' | 'failed';
  sendTime: number;
  providerId?: string;
  error?: string;
}

interface TestSummary {
  total: number;
  successful: number;
  failed: number;
  avgSendTime: number;
}

const emailTypes = [
  { id: 'welcome', label: 'Welcome Email', description: 'New user welcome message' },
  { id: 'certificate', label: 'Certificate', description: 'Course completion certificate' },
  { id: 'invite', label: 'Team Invitation', description: 'Employee invitation to join organization' },
  { id: 'confirm-signup', label: 'Email Confirmation', description: 'Verify email address' },
  { id: 'reset-password', label: 'Password Reset', description: 'Password reset link' },
  { id: 'magic-link', label: 'Magic Link', description: 'Passwordless sign-in link' },
  { id: 'seat-purchase-confirmation', label: 'Seat Purchase', description: 'Seat purchase confirmation' },
  { id: 'application-approved', label: 'Application Approved', description: 'Dispensary application approved' },
  { id: 'application-rejected', label: 'Application Rejected', description: 'Dispensary application rejected' },
  { id: 'profile-change-alert', label: 'Profile Change Alert', description: 'Profile modification notification' },
  { id: 'change-email', label: 'Email Change', description: 'Confirm new email address' },
  { id: 'training-coordinator-welcome', label: 'Coordinator Welcome', description: 'Training coordinator welcome' },
  { id: 'verification-code', label: 'Verification Code', description: 'Email verification code' },
];

export const TestEmailSender = () => {
  const { toast } = useToast();
  const [targetEmail, setTargetEmail] = useState("wisecyborg@gmail.com");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);

  const handleSelectAll = () => {
    if (selectedTypes.length === emailTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(emailTypes.map(t => t.id));
    }
  };

  const handleToggleType = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSendTestEmails = async () => {
    if (!targetEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a target email address",
        variant: "destructive",
      });
      return;
    }

    const typesToSend = selectedTypes.length > 0 ? selectedTypes : emailTypes.map(t => t.id);

    setIsLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-test-emails', {
        body: {
          targetEmail,
          emailTypes: typesToSend,
        },
      });

      if (error) throw error;

      setResults(data.results);
      setSummary(data.summary);

      toast({
        title: "Test Emails Sent",
        description: `Successfully sent ${data.summary.successful} of ${data.summary.total} test emails`,
      });

    } catch (error: any) {
      console.error('Error sending test emails:', error);
      toast({
        title: "Failed to Send Test Emails",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Email Suite
          </CardTitle>
          <CardDescription>
            Send test versions of all email templates to verify delivery, styling, and content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="targetEmail">Target Email Address</Label>
            <Input
              id="targetEmail"
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Email Types to Test</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedTypes.length === emailTypes.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border rounded-lg p-4">
              {emailTypes.map((type) => (
                <div key={type.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={type.id}
                    checked={selectedTypes.length === 0 || selectedTypes.includes(type.id)}
                    onCheckedChange={() => handleToggleType(type.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={type.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {type.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSendTestEmails}
            disabled={isLoading || !targetEmail}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Test Emails...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send {selectedTypes.length === 0 ? 'All' : selectedTypes.length} Test Email{(selectedTypes.length === 0 ? emailTypes.length : selectedTypes.length) !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600">{summary.successful}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg. Send Time</p>
                <p className="text-2xl font-bold">{summary.avgSendTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Send Time</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => {
                  const emailInfo = emailTypes.find(t => t.id === result.name);
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emailInfo?.label || result.name}</p>
                          <p className="text-xs text-muted-foreground">{emailInfo?.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.status === 'success' ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {result.sendTime}ms
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {result.status === 'success' ? (
                          <span className="text-muted-foreground">
                            ID: {result.providerId?.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-red-600">{result.error}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
