import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function SystemMaintenancePanel() {
  const [sendingReminders, setSendingReminders] = useState(false);
  const [clearingQueue, setClearingQueue] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSendReminders = async () => {
    setSendingReminders(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-all-manager-reminders");

      if (error) throw error;

      setResult({
        type: "reminders",
        success: true,
        data,
      });

      toast.success(`Sent ${data.sent} registration reminders`);
    } catch (error: any) {
      console.error("Error sending reminders:", error);
      setResult({
        type: "reminders",
        success: false,
        error: error.message,
      });
      toast.error("Failed to send reminders");
    } finally {
      setSendingReminders(false);
    }
  };

  const handleClearDeadLetterQueue = async () => {
    setClearingQueue(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("clear-deadletter-queue", {
        body: {
          job_type: "send_approval_email",
          before_date: "2024-11-05T00:00:00Z",
        },
      });

      if (error) throw error;

      setResult({
        type: "queue",
        success: true,
        data,
      });

      toast.success(`Deleted ${data.deleted} old jobs from dead-letter queue`);
    } catch (error: any) {
      console.error("Error clearing queue:", error);
      setResult({
        type: "queue",
        success: false,
        error: error.message,
      });
      toast.error("Failed to clear dead-letter queue");
    } finally {
      setClearingQueue(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Maintenance</CardTitle>
          <CardDescription>
            Critical pipeline maintenance and cleanup operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Send Manager Reminders */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <Mail className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-semibold">Send Manager Registration Reminders</h3>
                <p className="text-sm text-muted-foreground">
                  Send reminder emails to all approved applications with valid, unexpired registration tokens
                </p>
              </div>
              <Button
                onClick={handleSendReminders}
                disabled={sendingReminders}
                size="sm"
              >
                {sendingReminders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reminders
              </Button>
            </div>
          </div>

          {/* Clear Dead-Letter Queue */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-semibold">Clear Dead-Letter Queue</h3>
                <p className="text-sm text-muted-foreground">
                  Delete old failed approval email jobs from November 4th (with incorrect URLs)
                </p>
              </div>
              <Button
                onClick={handleClearDeadLetterQueue}
                disabled={clearingQueue}
                variant="destructive"
                size="sm"
              >
                {clearingQueue && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Clear Old Jobs
              </Button>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold">{result.data.message}</p>
                    {result.type === "reminders" && result.data.details && (
                      <div className="mt-2 space-y-1 text-sm">
                        {result.data.details.map((detail: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            {detail.success ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-600" />
                            )}
                            <span>
                              {detail.email} ({detail.organization})
                              {detail.success && ` - ${detail.days_remaining} days remaining`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.type === "queue" && result.data.deleted > 0 && (
                      <p className="text-sm mt-2">
                        Cleared {result.data.deleted} jobs from {result.data.jobs?.[0]?.moved_to_dlq_at.split('T')[0]}
                      </p>
                    )}
                  </div>
                ) : (
                  <p>Error: {result.error}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ About These Operations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Manager Reminders:</strong> Sends emails to approved dispensary applications
            that have valid registration tokens but haven't completed manager registration yet.
          </p>
          <p>
            <strong>Dead-Letter Queue:</strong> Removes old failed jobs that contain outdated
            URLs from before the domain migration. These jobs cannot be retried and clutter the queue.
          </p>
          <p className="text-xs mt-4 text-muted-foreground/70">
            Note: The "delivery_status" column error mentioned in postgres logs was investigated
            and found to be from the email_verification_codes table, which correctly uses this column.
            No fix needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
