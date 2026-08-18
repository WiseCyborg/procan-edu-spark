import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, ArrowLeft, BarChart, Calendar } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

const SNAP_DATE = 'Aug 18, 2026';

const VISITORS = [
  4, 2, 0, 2, 0, 0, 3, 4, 2, 0, 0, 1, 6, 1, 0, 1, 2, 1, 5, 4, 2, 7, 8, 10, 5, 12, 4, 3,
  5, 4, 5,
];
const PAGEVIEWS = [
  30, 32, 0, 2, 0, 0, 8, 6, 5, 0, 0, 1, 32, 1, 0, 1, 13, 6, 7, 53, 2, 13, 61, 75, 54, 41, 14,
  14, 18, 18, 27,
];

const DATE_LABELS = (() => {
  const start = new Date('2026-07-19T00:00:00Z');
  return Array.from({ length: VISITORS.length }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });
})();

const DAILY_DATA = DATE_LABELS.map((date, i) => ({
  date,
  visitors: VISITORS[i],
  pageviews: PAGEVIEWS[i],
}));

const KPI = [
  { label: 'Visitors (30d)', value: '103' },
  { label: 'Pageviews (30d)', value: '534' },
  { label: 'Pages/visit', value: '5.18' },
  { label: 'Bounce rate', value: '41%' },
];

const COUNTRY_DATA = [
  { country: 'US', visits: 79 },
  { country: 'Unknown', visits: 10 },
  { country: 'DE', visits: 1 },
  { country: 'VI', visits: 1 },
];

const DEVICE_DATA = [
  { name: 'Desktop', value: 90 },
  { name: 'Mobile', value: 24 },
];

const TOP_PAGES = [
  { path: '/', views: 43 },
  { path: '/verify', views: 12 },
  { path: '/auth', views: 12 },
  { path: '/demo', views: 10 },
  { path: '/admin', views: 10 },
  { path: '/communication', views: 10 },
  { path: '/learn', views: 9 },
  { path: '/course', views: 8 },
  { path: '/student-dashboard', views: 5 },
  { path: '/admin/video-studio', views: 5 },
];

const TRAFFIC_SOURCES = [
  { source: 'Direct', visits: 87 },
  { source: 'sandbox.paypal.com', visits: 3 },
  { source: 'google.com', visits: 2 },
];

const PRIMARY_COLOR = 'hsl(var(--primary))';
const ACCENT_COLOR = 'hsl(var(--accent))';
const MUTED_FOREGROUND_COLOR = 'hsl(var(--muted-foreground))';

const AnalyticsDashboard: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Admin role required to view Traffic & SEO Analytics.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link
            to="/admin"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4 rtl-flip" /> Admin
          </Link>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
            <BarChart className="h-7 w-7" /> Traffic & SEO Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Visitor trends, device split, top pages, and traffic sources.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/50 p-4">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Snapshot as of {SNAP_DATE}</p>
            <p className="text-sm text-muted-foreground">
              Ask in chat to refresh with new data. This page is static for now and does not call
              any live analytics API.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI.map((k) => (
            <Card key={k.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Visitors & Pageviews by Day</CardTitle>
            <CardDescription>Jul 19 – Aug 18, 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DAILY_DATA} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval={2}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    stroke={PRIMARY_COLOR}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    stroke={ACCENT_COLOR}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                    labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="visitors"
                    name="Visitors"
                    stroke={PRIMARY_COLOR}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pageviews"
                    name="Pageviews"
                    stroke={ACCENT_COLOR}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Traffic by Country</CardTitle>
              <CardDescription>Ranked by session count</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={COUNTRY_DATA} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="country" stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                      itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                      labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                    />
                    <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
                      {COUNTRY_DATA.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.country}`}
                          fill={PRIMARY_COLOR}
                          fillOpacity={1 - index * 0.2}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-muted-foreground">
                Country-level only — Google Analytics (added today) will add state/region-level
                detail after ~48h of data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device Split</CardTitle>
              <CardDescription>Desktop vs. Mobile sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DEVICE_DATA}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill={PRIMARY_COLOR} />
                      <Cell fill={MUTED_FOREGROUND_COLOR} />
                    </Pie>
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                      itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                      labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>Most viewed pages by session count</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-end">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TOP_PAGES.map((row) => (
                    <TableRow key={row.path}>
                      <TableCell className="font-mono text-sm">{row.path}</TableCell>
                      <TableCell className="text-end font-medium">{row.views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Attributed referrer sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-end">Visits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TRAFFIC_SOURCES.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell className="text-sm">{row.source}</TableCell>
                      <TableCell className="text-end font-medium">{row.visits}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-sm text-muted-foreground">
                87 of 92 attributed visits were direct — organic search traffic is close to zero
                right now.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Badge variant="outline" className="text-xs">
            Admin Only
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
