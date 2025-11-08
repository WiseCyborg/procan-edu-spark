import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EmailPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({
    receive_marketing: true,
    receive_reminders: true,
    receive_deadlines: true,
    receive_achievements: true,
    frequency: "instant",
  });

  // Fetch current preferences
  const { data: currentPrefs, isLoading } = useQuery({
    queryKey: ["email-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (currentPrefs) {
      setPreferences(currentPrefs);
    }
  }, [currentPrefs]);

  // Save preferences
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("email_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your email preferences have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Email Preferences</CardTitle>
        </div>
        <CardDescription>
          Control which emails you receive and how often
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing">Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Updates, tips, and feature announcements
              </p>
            </div>
            <Switch
              id="marketing"
              checked={preferences.receive_marketing}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, receive_marketing: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminders">Training Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Reminders to continue your training
              </p>
            </div>
            <Switch
              id="reminders"
              checked={preferences.receive_reminders}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, receive_reminders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="deadlines">Deadline Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Alerts when deadlines are approaching (always enabled)
              </p>
            </div>
            <Switch
              id="deadlines"
              checked={preferences.receive_deadlines}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, receive_deadlines: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="achievements">Achievement Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Celebrate when you complete modules or courses
              </p>
            </div>
            <Switch
              id="achievements"
              checked={preferences.receive_achievements}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, receive_achievements: checked })
              }
            />
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="frequency">Email Frequency</Label>
            <Select
              value={preferences.frequency}
              onValueChange={(value) =>
                setPreferences({ ...preferences, frequency: value })
              }
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant (as they happen)</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Critical emails (password resets, account security) are always sent instantly
            </p>
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
