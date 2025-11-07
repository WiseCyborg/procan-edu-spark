import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAiLeanAnalytics } from '@/hooks/useAiLeanAnalytics';
import { MessageSquare, Users, Clock, MessageCircle, TrendingUp, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { AiLeanSessionViewer } from './AiLeanSessionViewer';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export const AiLeanAnalyticsDashboard = () => {
  const { analytics, loading } = useAiLeanAnalytics();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Sessions',
      value: analytics.totalSessions,
      icon: MessageSquare,
      description: 'All coaching sessions',
      color: 'text-blue-600',
    },
    {
      title: 'Active Managers',
      value: analytics.totalUsers,
      icon: Users,
      description: 'Using AiLean coaching',
      color: 'text-green-600',
    },
    {
      title: 'Avg Session Length',
      value: `${analytics.avgSessionDuration}m`,
      icon: Clock,
      description: 'Per coaching session',
      color: 'text-orange-600',
    },
    {
      title: 'Total Messages',
      value: analytics.totalMessages,
      icon: MessageCircle,
      description: 'Across all sessions',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Popular Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Scenarios
            </CardTitle>
            <CardDescription>Most frequently coached topics</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.popularScenarios.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.popularScenarios} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="scenario" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No scenario data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sessions Over Time
            </CardTitle>
            <CardDescription>Last 30 days activity</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.sessionsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.sessionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No timeline data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Engaged Managers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Engaged Managers</CardTitle>
          <CardDescription>Most active users of AiLean coaching</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manager Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Session Count</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.topUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.user_name}</TableCell>
                    <TableCell>{user.organization_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.session_count}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(user.last_active), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserId(user.user_id)}
                      >
                        View Sessions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              No user data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Latest AiLean coaching conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentSessions.length > 0 ? (
            <div className="space-y-4">
              {analytics.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{session.title}</h4>
                      {session.scenario_type && (
                        <Badge variant="outline">{session.scenario_type}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{session.user_name}</span>
                      {session.organization_name && <span>• {session.organization_name}</span>}
                      <span>• {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {session.message_count} messages
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              No recent sessions
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Viewer Modal */}
      {selectedSessionId && (
        <AiLeanSessionViewer
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}

      {selectedUserId && (
        <AiLeanSessionViewer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
};
