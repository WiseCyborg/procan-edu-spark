import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function DeadlineCountdown() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<any>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEnrollment();
    }
  }, [user]);

  const fetchEnrollment = async () => {
    try {
      const { data, error } = await supabase
        .from("rvt_enrollments" as any)
        .select("*")
        .eq("user_id", user?.id)
        .is("completed_at", null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const enrollmentData = data as any;
        if (enrollmentData && enrollmentData.deadline_at) {
          setEnrollment(enrollmentData);
          const deadline = new Date(enrollmentData.deadline_at);
          const now = new Date();
          const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setDaysRemaining(days);
        }
      }
    } catch (error) {
      console.error("Error fetching enrollment:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !enrollment) return null;

  const urgencyLevel = daysRemaining <= 1 ? "critical" : daysRemaining <= 3 ? "high" : daysRemaining <= 7 ? "medium" : "low";
  const urgencyColor = 
    urgencyLevel === "critical" ? "text-red-600" :
    urgencyLevel === "high" ? "text-orange-600" :
    urgencyLevel === "medium" ? "text-yellow-600" :
    "text-green-600";

  const progressValue = Math.max(0, Math.min(100, (enrollment.completion_percentage || 0)));

  return (
    <Card className={`border-l-4 ${
      urgencyLevel === "critical" ? "border-l-red-600" :
      urgencyLevel === "high" ? "border-l-orange-600" :
      urgencyLevel === "medium" ? "border-l-yellow-600" :
      "border-l-green-600"
    }`}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {urgencyLevel === "critical" || urgencyLevel === "high" ? (
              <AlertCircle className={`h-5 w-5 ${urgencyColor}`} />
            ) : (
              <Clock className={`h-5 w-5 ${urgencyColor}`} />
            )}
            <div>
              <p className="font-semibold">Training Deadline</p>
              <p className="text-sm text-muted-foreground">
                {new Date(enrollment.deadline_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${urgencyColor}`}>{daysRemaining}</p>
            <p className="text-xs text-muted-foreground">days left</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Course Progress</span>
            <span className="font-medium">{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {urgencyLevel === "critical" && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">
              🚨 Final Reminder: Complete your training today!
            </p>
          </div>
        )}

        {urgencyLevel === "high" && (
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              ⚠️ Deadline approaching soon. Don't wait until the last minute!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
