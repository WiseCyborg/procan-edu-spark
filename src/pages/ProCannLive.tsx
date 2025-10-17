import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

interface LiveSession {
  id: string;
  title: string;
  description: string;
  host_name: string;
  host_bio: string;
  session_date: string;
  duration_minutes: number;
  max_attendees: number;
  session_type: string;
  registered_count: number;
  user_registered: boolean;
}

const ProCannLive = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('is_active', true)
        .gte('session_date', new Date().toISOString())
        .order('session_date', { ascending: true });

      if (error) throw error;

      // Check user registrations if authenticated
      let userRegistrations: string[] = [];
      if (user) {
        const { data: regData } = await supabase
          .from('live_session_registrations')
          .select('session_id')
          .eq('user_id', user.id);
        userRegistrations = regData?.map(r => r.session_id) || [];
      }

      // Get registration counts
      const sessionsWithRegistration = await Promise.all((data || []).map(async session => {
        const { count } = await supabase
          .from('live_session_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        return {
          ...session,
          registered_count: count || 0,
          user_registered: userRegistrations.includes(session.id)
        };
      }));

      setSessions(sessionsWithRegistration);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (sessionId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to register for live sessions.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('live_session_registrations')
        .insert({ session_id: sessionId, user_id: user.id });

      if (error) throw error;

      toast({
        title: "Registration Successful!",
        description: "You'll receive a confirmation email with session details."
      });

      fetchSessions();
    } catch (error) {
      console.error('Error registering:', error);
      toast({
        title: "Registration Failed",
        description: "Unable to register. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sessionTypeColors: {[key: string]: string} = {
    workshop: 'bg-blue-100 text-blue-800',
    q_and_a: 'bg-green-100 text-green-800',
    compliance_chat: 'bg-yellow-100 text-yellow-800',
    best_practices: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stoplight-cream to-white">
      {/* Hero Section */}
      <section className="py-16 px-4 bg-stoplight-green text-white">
        <div className="container mx-auto text-center">
          <Video className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-5xl font-bold mb-4 font-poppins">ProCann LIVE</h1>
          <p className="text-xl max-w-2xl mx-auto font-inter">
            Connect with Maryland's cannabis education experts in real-time. 
            Ask questions, share experiences, and grow together.
          </p>
        </div>
      </section>

      {/* Sessions Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          {loading ? (
            <p className="text-center">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <Card className="text-center p-8">
              <p className="text-lg text-gray-600">No upcoming sessions scheduled. Check back soon!</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map(session => (
                <Card key={session.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge className={sessionTypeColors[session.session_type]}>
                        {session.session_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        <Users className="w-3 h-3 mr-1" />
                        {session.registered_count}/{session.max_attendees}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-poppins">{session.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-gray-600 mb-4 flex-1 font-inter">
                      {session.description}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(session.session_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(session.session_date).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })} ({session.duration_minutes} min)
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Host</p>
                      <p className="text-sm text-gray-600">{session.host_name}</p>
                    </div>

                    <Button 
                      className="mt-4 w-full"
                      onClick={() => handleRegister(session.id)}
                      disabled={session.user_registered || session.registered_count >= session.max_attendees}
                    >
                      {session.user_registered 
                        ? 'Already Registered' 
                        : session.registered_count >= session.max_attendees
                        ? 'Session Full'
                        : 'Reserve Your Spot'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProCannLive;