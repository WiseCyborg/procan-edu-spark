import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, ClipboardList } from 'lucide-react';

interface UATTestResult {
  id: string;
  test_id: string;
  role: string;
  scenario: string;
  steps: string | null;
  expected_result: string | null;
  actual_result: string | null;
  status: string;
  notes: string | null;
  tested_by: string | null;
  tested_at: string | null;
  created_at: string;
}

const DEFAULT_TESTS = [
  // Management
  { test_id: 'UAT-MGMT-001', role: 'Admin', scenario: 'Admin login and dashboard access', steps: 'Login as admin → verify dashboard loads with real metrics', expected_result: 'Dashboard shows org count, learner count, certificates issued' },
  { test_id: 'UAT-MGMT-002', role: 'Admin', scenario: 'User management and role assignment', steps: 'Admin → Users tab → assign role to user', expected_result: 'Role appears in user_roles table, UI reflects change' },
  { test_id: 'UAT-MGMT-003', role: 'Admin', scenario: 'Certificate reporting', steps: 'Admin → Certificates tab → view all issued certs', expected_result: 'All certificates listed with verification codes and dates' },
  { test_id: 'UAT-MGMT-004', role: 'Admin', scenario: 'Organization creation and management', steps: 'Admin → Organizations → create org → assign seats', expected_result: 'Organization appears with correct seat count and join code' },
  { test_id: 'UAT-MGMT-005', role: 'Admin', scenario: 'Reset exam state for testing', steps: 'Call reset_exam_state RPC for test user', expected_result: 'All exam_attempts and exam_checkins deleted for that user' },

  // Organization Admin / Manager
  { test_id: 'UAT-ORG-001', role: 'Manager', scenario: 'Manager login and org-scoped view', steps: 'Login as dispensary manager → verify org dashboard', expected_result: 'Only own org employees visible, seat utilization shown' },
  { test_id: 'UAT-ORG-002', role: 'Manager', scenario: 'Enroll employee into course', steps: 'Manager → invite employee → employee receives invite', expected_result: 'Employee appears in roster with pending status' },
  { test_id: 'UAT-ORG-003', role: 'Manager', scenario: 'Track learner progress', steps: 'Manager → view employee progress → check completion %', expected_result: 'Progress percentage matches actual module completions' },
  { test_id: 'UAT-ORG-004', role: 'Manager', scenario: 'Verify exam check-in (photo)', steps: 'Employee submits selfie → Manager sees in queue → approves', expected_result: 'exam_checkins.status = verified, employee can proceed to exam' },
  { test_id: 'UAT-ORG-005', role: 'Manager', scenario: 'View employee certificates', steps: 'Manager → Certificates → filter by org', expected_result: 'Only org employee certificates shown' },

  // Student
  { test_id: 'UAT-STU-001', role: 'Student', scenario: 'Student registration and login', steps: 'Register with join code or invite → verify email → login', expected_result: 'Student dashboard loads with assigned course' },
  { test_id: 'UAT-STU-002', role: 'Student', scenario: 'Course access and module completion', steps: 'Start course → complete Module 0 → verify Module 1 unlocks', expected_result: 'Module gating works, progress persists to database' },
  { test_id: 'UAT-STU-003', role: 'Student', scenario: 'Complete all modules', steps: 'Complete modules 0-17 → verify all marked complete', expected_result: 'user_progress shows 18/18 complete, exam unlocked' },
  { test_id: 'UAT-STU-004', role: 'Student', scenario: 'Exam check-in with selfie', steps: 'Start exam → capture selfie → submit', expected_result: 'exam_checkins row created with status=pending, photo_url set' },
  { test_id: 'UAT-STU-005', role: 'Student', scenario: 'Pass exam and receive certificate', steps: 'Complete exam with ≥80% → system issues certificate', expected_result: 'Certificate row created with verification code, PDF downloadable' },
  { test_id: 'UAT-STU-006', role: 'Student', scenario: 'Fail exam and see remediation', steps: 'Complete exam with <80% → view results', expected_result: 'No certificate issued, remediation recommendations shown' },
  { test_id: 'UAT-STU-007', role: 'Student', scenario: 'Resume interrupted course', steps: 'Exit mid-module → log back in → resume', expected_result: 'Progress restored, correct module/page loaded' },

  // Certificate
  { test_id: 'UAT-CERT-001', role: 'System', scenario: 'Certificate generation conditions', steps: 'Trigger certificate for user with 100% completion + passing exam', expected_result: 'Certificate issued with correct name, course, date, verification code' },
  { test_id: 'UAT-CERT-002', role: 'System', scenario: 'Certificate duplicate prevention', steps: 'Trigger certificate issuance twice for same user+course', expected_result: 'Only one certificate exists, no duplicate' },
  { test_id: 'UAT-CERT-003', role: 'Public', scenario: 'Public certificate verification', steps: 'Visit /verify-certificate → enter valid code', expected_result: 'Certificate details shown (name, course, date, valid status)' },
  { test_id: 'UAT-CERT-004', role: 'Public', scenario: 'Invalid certificate code', steps: 'Visit /verify-certificate → enter fake code', expected_result: 'Not found message displayed' },

  // Permissions
  { test_id: 'UAT-SEC-001', role: 'Student', scenario: 'Student cannot access admin routes', steps: 'Login as student → navigate to /admin', expected_result: 'Redirected to dashboard, admin content not visible' },
  { test_id: 'UAT-SEC-002', role: 'Manager', scenario: 'Manager cannot see other org data', steps: 'Login as manager → attempt to query other org employees', expected_result: 'RLS blocks cross-org data, empty results' },
  { test_id: 'UAT-SEC-003', role: 'Student', scenario: 'No course access without entitlement', steps: 'Login as user without entitlement → navigate to /course', expected_result: 'Redirected to payment/enrollment gate' },
];

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'bg-muted text-muted-foreground' },
  pass: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  fail: { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  blocked: { icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
};

const UATTestMatrix: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: tests, isLoading } = useQuery({
    queryKey: ['uat-test-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uat_test_results')
        .select('*')
        .order('test_id');
      if (error) throw error;
      return data as UATTestResult[];
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const rows = DEFAULT_TESTS.map(t => ({
        test_id: t.test_id,
        role: t.role,
        scenario: t.scenario,
        steps: t.steps,
        expected_result: t.expected_result,
        status: 'pending',
      }));
      const { error } = await supabase.from('uat_test_results').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uat-test-results'] });
      toast.success('Test cases seeded successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; status?: string; actual_result?: string; notes?: string }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (params.status) {
        updates.status = params.status;
        updates.tested_by = user?.id;
        updates.tested_at = new Date().toISOString();
      }
      if (params.actual_result !== undefined) updates.actual_result = params.actual_result;
      if (params.notes !== undefined) updates.notes = params.notes;

      const { error } = await supabase.from('uat_test_results').update(updates).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uat-test-results'] }),
  });

  const filtered = (tests || []).filter(t => {
    if (filterRole !== 'all' && t.role !== filterRole) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const summary = {
    total: tests?.length || 0,
    pass: tests?.filter(t => t.status === 'pass').length || 0,
    fail: tests?.filter(t => t.status === 'fail').length || 0,
    pending: tests?.filter(t => t.status === 'pending').length || 0,
    blocked: tests?.filter(t => t.status === 'blocked').length || 0,
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> UAT Test Matrix
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track pass/fail status for all role-based test scenarios</p>
        </div>
        {(!tests || tests.length === 0) && (
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            Seed Test Cases ({DEFAULT_TESTS.length})
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: summary.total, cls: 'text-foreground' },
          { label: 'Pass', value: summary.pass, cls: 'text-green-600' },
          { label: 'Fail', value: summary.fail, cls: 'text-red-600' },
          { label: 'Pending', value: summary.pending, cls: 'text-muted-foreground' },
          { label: 'Blocked', value: summary.blocked, cls: 'text-yellow-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
            <SelectItem value="Student">Student</SelectItem>
            <SelectItem value="System">System</SelectItem>
            <SelectItem value="Public">Public</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Test rows */}
      <div className="space-y-3">
        {filtered.map(test => {
          const sc = statusConfig[test.status] || statusConfig.pending;
          return (
            <Card key={test.id} className="border-l-4" style={{ borderLeftColor: test.status === 'pass' ? 'hsl(var(--chart-2))' : test.status === 'fail' ? 'hsl(var(--destructive))' : 'hsl(var(--muted))' }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">{test.test_id}</Badge>
                    <Badge className={sc.color}>{sc.icon}<span className="ml-1 capitalize">{test.status}</span></Badge>
                    <Badge variant="secondary">{test.role}</Badge>
                  </div>
                  <Select
                    value={test.status}
                    onValueChange={(val) => updateMutation.mutate({ id: test.id, status: val })}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardTitle className="text-sm font-medium mt-1">{test.scenario}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2 text-xs">
                {test.steps && <div><span className="font-semibold text-muted-foreground">Steps:</span> {test.steps}</div>}
                {test.expected_result && <div><span className="font-semibold text-muted-foreground">Expected:</span> {test.expected_result}</div>}
                <Textarea
                  placeholder="Actual result / notes..."
                  className="text-xs min-h-[60px]"
                  defaultValue={test.actual_result || test.notes || ''}
                  onBlur={(e) => updateMutation.mutate({ id: test.id, actual_result: e.target.value, notes: e.target.value })}
                />
                {test.tested_at && (
                  <div className="text-muted-foreground">Last tested: {new Date(test.tested_at).toLocaleString()}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && tests && tests.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">No tests match current filters.</div>
      )}
    </div>
  );
};

export default UATTestMatrix;
