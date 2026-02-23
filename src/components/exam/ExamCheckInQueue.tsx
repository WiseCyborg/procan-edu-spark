import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, Clock, UserCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CheckInItem {
  id: string;
  attempt_id: string;
  user_id: string;
  course_id: string;
  photo_url: string | null;
  status: string;
  bypass_reason: string | null;
  created_at: string;
  // joined profile data
  first_name?: string;
  last_name?: string;
  email_cache?: string;
}

export const ExamCheckInQueue: React.FC = () => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckInItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchPendingCheckIns = async () => {
    setLoading(true);
    try {
      // Fetch pending check-ins (RLS scopes to org automatically)
      const { data, error } = await supabase
        .from('exam_checkins')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch profile info for each user
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email_cache')
          .in('user_id', userIds);

        const profileMap = new Map(
          (profiles || []).map((p) => [p.user_id, p])
        );

        const enriched = data.map((item) => {
          const profile = profileMap.get(item.user_id);
          return {
            ...item,
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email_cache: profile?.email_cache || '',
          };
        });

        setCheckIns(enriched);
      } else {
        setCheckIns([]);
      }
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      toast.error('Failed to load pending check-ins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCheckIns();

    // Real-time subscription for new check-ins
    const channel = supabase
      .channel('exam-checkins-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_checkins',
        },
        () => {
          fetchPendingCheckIns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVerify = async (checkin: CheckInItem) => {
    if (!user) return;

    setVerifying(checkin.id);
    try {
      const { error } = await supabase
        .from('exam_checkins')
        .update({
          status: 'verified',
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', checkin.id);

      if (error) throw error;

      // Log to security audit via schema-matched RPC
      await supabase.rpc('log_exam_identity_verification', {
        p_checkin_id: checkin.id,
      });

      toast.success(
        `Identity verified for ${checkin.first_name} ${checkin.last_name}`
      );

      // Remove from local list
      setCheckIns((prev) => prev.filter((c) => c.id !== checkin.id));
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify identity. Please try again.');
    } finally {
      setVerifying(null);
    }
  };

  const getInitials = (first?: string, last?: string) => {
    return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Exam Identity Check-Ins
            </CardTitle>
            <CardDescription>
              Verify employee identity before they can start the final exam
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPendingCheckIns}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : checkIns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No pending check-ins</p>
            <p className="text-xs mt-1">
              Employees awaiting verification will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkIns.map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center gap-4 p-4 border rounded-lg bg-card"
              >
                {/* Photo or Avatar */}
                <div className="flex-shrink-0">
                  {checkin.photo_url ? (
                    <img
                      src={checkin.photo_url}
                      alt={`${checkin.first_name} verification photo`}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-muted"
                    />
                  ) : (
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-lg">
                        {getInitials(checkin.first_name, checkin.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {checkin.first_name} {checkin.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {checkin.email_cache}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Submitted at {formatTime(checkin.created_at)}
                    </span>
                    {!checkin.photo_url && (
                      <Badge variant="outline" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        No photo
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Verify Button */}
                <Button
                  onClick={() => handleVerify(checkin)}
                  disabled={verifying === checkin.id}
                  className="flex-shrink-0"
                >
                  {verifying === checkin.id ? (
                    'Verifying...'
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
