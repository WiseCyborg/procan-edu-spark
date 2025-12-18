/**
 * Pipeline Agent Event Schema & Type Definitions
 * 
 * This file defines the complete type system for all pipeline agents
 * in the ProCann EDU platform.
 */

// ============= AGENT IDENTIFIERS =============
export type AgentType = 
  | 'pipeline_health'      // Meta-agent: owns truth across system
  | 'organization_integrity' // Ensures approved orgs have managers + join codes
  | 'seat_reconciliation'    // Ensures seat counts match reality
  | 'application_state'      // Enforces valid state transitions
  | 'access_progress'        // Fixes training unlock + dashboard routing
  | 'communications'         // Email health + personalization
  | 'certificate_integrity'; // Owns public verification trust

// ============= PIPELINE IDENTIFIERS =============
export type PipelineType = 
  | 'application'
  | 'organization'
  | 'seat'
  | 'training'
  | 'certification'
  | 'communications';

// ============= SEVERITY LEVELS =============
export type IssueSeverity = 'info' | 'warning' | 'critical';

// ============= HEALTH STATUS =============
export type HealthStatus = 'healthy' | 'degraded' | 'broken';

// ============= ISSUE TYPES BY PIPELINE =============
export type ApplicationIssueType = 
  | 'approved_without_org'
  | 'stuck_in_review'
  | 'duplicate_submission'
  | 'invalid_state_transition';

export type OrganizationIssueType = 
  | 'unregistered_manager'
  | 'expired_registration_token'
  | 'no_manager_no_token'
  | 'missing_join_code'
  | 'expired_join_codes'
  | 'inactive_org_with_users';

export type SeatIssueType = 
  | 'seat_deficit'
  | 'seat_surplus'
  | 'orphaned_seats'
  | 'seat_user_mismatch';

export type TrainingIssueType = 
  | 'stalled_training'
  | 'module_unlock_blocked'
  | 'progress_not_persisted'
  | 'invalid_route_access';

export type CertificationIssueType = 
  | 'passed_no_certificate'
  | 'certificate_not_verified'
  | 'expired_certificate'
  | 'revoked_certificate';

export type CommunicationsIssueType = 
  | 'email_delivery_failed'
  | 'email_bounce'
  | 'circuit_breaker_open'
  | 'missing_personalization';

export type IssueType = 
  | ApplicationIssueType 
  | OrganizationIssueType 
  | SeatIssueType 
  | TrainingIssueType 
  | CertificationIssueType
  | CommunicationsIssueType;

// ============= PIPELINE ISSUE EVENT =============
export interface PipelineIssue {
  id?: string;
  pipeline: PipelineType;
  severity: IssueSeverity;
  issue_type: IssueType;
  description: string;
  organization_id?: string;
  user_id?: string;
  auto_fixed: boolean;
  fix_action?: string;
  requires_admin: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

// ============= AGENT RUN RESULT =============
export interface AgentRunResult {
  success: boolean;
  agent: AgentType;
  summary: {
    issues_detected: number;
    auto_fixed: number;
    needs_admin: number;
    duration_ms: number;
  };
  issues: PipelineIssue[];
  error?: string;
}

// ============= HEALTH SNAPSHOT =============
export interface PipelineHealthSnapshot {
  id: string;
  // Organization metrics
  total_orgs: number;
  healthy_orgs: number;
  orgs_with_issues: number;
  
  // Seat metrics
  total_seats: number;
  allocated_seats: number;
  seat_mismatches: number;
  
  // User metrics
  unregistered_managers: number;
  stalled_users: number;
  total_in_training: number;
  total_certified: number;
  
  // Pipeline health
  pipelines_healthy: number;
  pipelines_total: number;
  
  // Issue tracking
  issues_detected: number;
  auto_fixed_today: number;
  needs_admin_attention: number;
  
  // Timing
  last_run_at: string;
  last_run_duration_ms: number;
  updated_at?: string;
}

// ============= HEALTH FEED ITEM =============
export interface HealthFeedItem {
  id: string;
  timestamp: string;
  agent: AgentType;
  pipeline: PipelineType;
  severity: IssueSeverity;
  title: string;
  description: string;
  
  // Context
  organization_id?: string;
  organization_name?: string;
  user_id?: string;
  user_name?: string;
  
  // Resolution
  auto_fixed: boolean;
  fix_action?: string;
  requires_admin: boolean;
  
  // UI state
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  
  // Linked data
  metadata?: Record<string, unknown>;
}

// ============= PIPELINE DIMENSION STATUS =============
export interface PipelineDimensionStatus {
  dimension: PipelineType;
  status: HealthStatus;
  issues_count: number;
  last_check: string;
  agent_responsible: AgentType;
}

// ============= AGENT → UI BINDING =============
export interface AgentUIBinding {
  agent: AgentType;
  triggers: AgentTrigger[];
  ui_components: string[];
  metrics_updated: string[];
  actions_available: AgentAction[];
}

export interface AgentTrigger {
  type: 'event' | 'schedule' | 'anomaly' | 'error' | 'agent_report';
  source: string;
  description: string;
}

export interface AgentAction {
  id: string;
  label: string;
  auto_executable: boolean;
  requires_confirmation: boolean;
  risk_level: 'low' | 'medium' | 'high';
}

// ============= AGENT CONFIGURATION =============
export const AGENT_CONFIGS: Record<AgentType, AgentUIBinding> = {
  pipeline_health: {
    agent: 'pipeline_health',
    triggers: [
      { type: 'event', source: 'org_approved', description: 'Organization approved' },
      { type: 'event', source: 'seat_purchased', description: 'Seats purchased' },
      { type: 'event', source: 'manager_invited', description: 'Manager invited' },
      { type: 'schedule', source: 'cron', description: 'Every 5 minutes' },
      { type: 'anomaly', source: 'metric_zero', description: 'Metric shows 0 but records exist' },
      { type: 'error', source: '404', description: 'Dashboard returned 404' },
      { type: 'agent_report', source: 'child_agent', description: 'Child agent reports issue' },
    ],
    ui_components: [
      'AdminMissionControl',
      'PipelineHealthAgent',
      'HealthFeed',
      'SystemHealthOverview',
    ],
    metrics_updated: [
      'pipelines_healthy',
      'issues_detected',
      'auto_fixed_today',
      'needs_admin_attention',
    ],
    actions_available: [
      { id: 'run_full_check', label: 'Run Full Health Check', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
      { id: 'acknowledge_all', label: 'Acknowledge All', auto_executable: false, requires_confirmation: true, risk_level: 'low' },
    ],
  },
  
  organization_integrity: {
    agent: 'organization_integrity',
    triggers: [
      { type: 'event', source: 'org_approved', description: 'Organization approved' },
      { type: 'schedule', source: 'cron', description: 'Every 15 minutes' },
      { type: 'anomaly', source: 'manager_missing', description: 'Org has no registered manager' },
    ],
    ui_components: [
      'OrganizationsManagement',
      'DispensaryManagement',
      'AdminMissionControl',
    ],
    metrics_updated: [
      'unregistered_managers',
      'orgs_with_issues',
      'healthy_orgs',
    ],
    actions_available: [
      { id: 'regenerate_token', label: 'Regenerate Registration Token', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
      { id: 'send_reminder', label: 'Send Manager Reminder', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
      { id: 'regenerate_join_code', label: 'Regenerate Join Code', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
      { id: 'deactivate_org', label: 'Deactivate Organization', auto_executable: false, requires_confirmation: true, risk_level: 'high' },
    ],
  },
  
  seat_reconciliation: {
    agent: 'seat_reconciliation',
    triggers: [
      { type: 'event', source: 'seat_purchased', description: 'Seats purchased' },
      { type: 'event', source: 'employee_registered', description: 'Employee registered' },
      { type: 'schedule', source: 'cron', description: 'Every 30 minutes' },
      { type: 'anomaly', source: 'count_mismatch', description: 'Seat count mismatch detected' },
    ],
    ui_components: [
      'SeatManagement',
      'SeatAllocationMonitor',
      'AdminMissionControl',
    ],
    metrics_updated: [
      'total_seats',
      'allocated_seats',
      'seat_mismatches',
    ],
    actions_available: [
      { id: 'create_missing_seats', label: 'Create Missing Seats', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
      { id: 'archive_orphaned', label: 'Archive Orphaned Seats', auto_executable: false, requires_confirmation: true, risk_level: 'medium' },
      { id: 'reconcile_all', label: 'Full Reconciliation', auto_executable: false, requires_confirmation: true, risk_level: 'medium' },
    ],
  },
  
  application_state: {
    agent: 'application_state',
    triggers: [
      { type: 'event', source: 'application_submitted', description: 'Application submitted' },
      { type: 'event', source: 'application_approved', description: 'Application approved' },
      { type: 'event', source: 'application_rejected', description: 'Application rejected' },
      { type: 'anomaly', source: 'invalid_transition', description: 'Invalid state transition attempted' },
    ],
    ui_components: [
      'DispensaryApplicationManager',
      'RevenuePipelineFunnel',
      'AdminMissionControl',
    ],
    metrics_updated: [
      'applications_pending',
      'applications_approved',
      'approval_rate',
    ],
    actions_available: [
      { id: 'approve_application', label: 'Approve Application', auto_executable: false, requires_confirmation: true, risk_level: 'medium' },
      { id: 'reject_application', label: 'Reject Application', auto_executable: false, requires_confirmation: true, risk_level: 'medium' },
      { id: 'request_info', label: 'Request More Information', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
    ],
  },
  
  access_progress: {
    agent: 'access_progress',
    triggers: [
      { type: 'event', source: 'user_login', description: 'User logged in' },
      { type: 'event', source: 'module_completed', description: 'Module completed' },
      { type: 'error', source: '404', description: 'Dashboard 404 error' },
      { type: 'anomaly', source: 'route_mismatch', description: 'User accessing wrong route' },
    ],
    ui_components: [
      'StudentDashboard',
      'ManagerDashboard',
      'TrainingModule',
      'ModuleSidebar',
    ],
    metrics_updated: [
      'stalled_users',
      'total_in_training',
      'completion_rate',
    ],
    actions_available: [
      { id: 'unlock_module', label: 'Unlock Module', auto_executable: false, requires_confirmation: true, risk_level: 'medium' },
      { id: 'send_nudge', label: 'Send Progress Nudge', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
      { id: 'reassign_role', label: 'Reassign User Role', auto_executable: false, requires_confirmation: true, risk_level: 'high' },
    ],
  },
  
  communications: {
    agent: 'communications',
    triggers: [
      { type: 'event', source: 'email_sent', description: 'Email sent' },
      { type: 'event', source: 'email_bounced', description: 'Email bounced' },
      { type: 'error', source: 'delivery_failed', description: 'Email delivery failed' },
      { type: 'anomaly', source: 'high_bounce_rate', description: 'High bounce rate detected' },
    ],
    ui_components: [
      'EmailHealthDashboard',
      'CommunicationsHub',
      'AdminMissionControl',
    ],
    metrics_updated: [
      'emails_sent_24h',
      'delivery_rate',
      'bounce_rate',
      'circuit_state',
    ],
    actions_available: [
      { id: 'retry_failed', label: 'Retry Failed Emails', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
      { id: 'reset_circuit', label: 'Reset Circuit Breaker', auto_executable: false, requires_confirmation: true, risk_level: 'medium' },
      { id: 'pause_sending', label: 'Pause Email Sending', auto_executable: false, requires_confirmation: true, risk_level: 'high' },
    ],
  },
  
  certificate_integrity: {
    agent: 'certificate_integrity',
    triggers: [
      { type: 'event', source: 'exam_passed', description: 'Exam passed' },
      { type: 'event', source: 'certificate_issued', description: 'Certificate issued' },
      { type: 'event', source: 'certificate_verified', description: 'Certificate verified' },
      { type: 'schedule', source: 'cron', description: 'Daily expiry check' },
    ],
    ui_components: [
      'CertificateVerification',
      'CertificatesManagement',
      'AdminMissionControl',
    ],
    metrics_updated: [
      'total_certified',
      'certificates_expiring',
      'verification_count',
    ],
    actions_available: [
      { id: 'generate_certificate', label: 'Generate Certificate', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
      { id: 'revoke_certificate', label: 'Revoke Certificate', auto_executable: false, requires_confirmation: true, risk_level: 'high' },
      { id: 'send_expiry_warning', label: 'Send Expiry Warning', auto_executable: true, requires_confirmation: false, risk_level: 'low' },
    ],
  },
};

// ============= HELPER FUNCTIONS =============
export function getHealthStatusFromPercentage(percentage: number): HealthStatus {
  if (percentage >= 90) return 'healthy';
  if (percentage >= 70) return 'degraded';
  return 'broken';
}

export function getSeverityWeight(severity: IssueSeverity): number {
  switch (severity) {
    case 'critical': return 3;
    case 'warning': return 2;
    case 'info': return 1;
  }
}

export function sortIssuesBySeverity(issues: PipelineIssue[]): PipelineIssue[] {
  return [...issues].sort((a, b) => getSeverityWeight(b.severity) - getSeverityWeight(a.severity));
}
